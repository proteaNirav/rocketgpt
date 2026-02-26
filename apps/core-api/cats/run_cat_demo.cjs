const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function repoRootFromHere() {
  // apps/core-api/cats -> repo root
  return path.resolve(__dirname, "..", "..", "..");
}

function loadCats(root) {
  const defsDir = path.join(root, "cats", "definitions");
  if (!fs.existsSync(defsDir)) return [];
  return fs.readdirSync(defsDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort()
    .map((f) => {
      const filePath = path.join(defsDir, f);
      const raw = fs.readFileSync(filePath, "utf8");
      const def = JSON.parse(raw);
      return { def, filePath, raw };
    });
}

function loadPoliceRegister(root) {
  const registerPath = path.join(root, "cats", "police_register.demo.json");
  if (!fs.existsSync(registerPath)) return null;
  return JSON.parse(fs.readFileSync(registerPath, "utf8"));
}

function loadRegistryIndex(root) {
  const registryPath = path.join(root, "cats", "registry_index.json");
  if (!fs.existsSync(registryPath)) {
    throw new Error(`CAT registry missing: ${registryPath}`);
  }
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function failWithCode(code, message) {
  const err = new Error(message);
  err.code = code;
  throw err;
}

const DEMO_DENY_STATUS_BY_REASON = {
  expired: "EXPIRED",
  digest: "DIGEST_MISMATCH",
  registry: "REGISTRY_MISMATCH",
  passport: "PASSPORT_MISMATCH"
};

function parseCliArgs(argv) {
  const args = argv.slice(2);
  let catId = null;
  let jsonArg = null;
  let denyReason = null;
  let renew = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--renew") {
      renew = true;
      continue;
    }
    if (arg === "--deny") {
      const next = args[i + 1];
      if (!next) {
        failWithCode(
          "INVALID_ARGS",
          "Missing value for --deny (expected: expired|digest|registry|passport)"
        );
      }
      denyReason = next;
      i += 1;
      continue;
    }
    if (!catId) {
      catId = arg;
      continue;
    }
    if (!jsonArg) {
      jsonArg = arg;
      continue;
    }
    failWithCode(
      "INVALID_ARGS",
      `Unexpected extra argument: ${arg}`
    );
  }

  if (denyReason && !DEMO_DENY_STATUS_BY_REASON[denyReason]) {
    failWithCode(
      "INVALID_DEMO_DENY_REASON",
      `Invalid --deny reason '${denyReason}' (expected: expired|digest|registry|passport)`
    );
  }

  return { catId, jsonArg, denyReason, renew };
}

function getRenewalPolicy(register) {
  const raw = register && typeof register === "object" ? register.renewal_policy : null;
  const fallbackTtl = Number(register && register.default_ttl_days);
  const defaultTtl = Number(raw && raw.default_ttl_days);
  const graceDays = Number(raw && raw.renewal_grace_days);
  return {
    default_ttl_days: Number.isFinite(defaultTtl) ? defaultTtl : (Number.isFinite(fallbackTtl) ? fallbackTtl : 90),
    renewal_grace_days: Number.isFinite(graceDays) ? graceDays : 15
  };
}

function findPassportById(register, passportId) {
  if (!register || !Array.isArray(register.passports) || !passportId) return null;
  return register.passports.find((p) => p && p.passport_id === passportId) || null;
}

function buildRenewalRequest(def, passport, bundleDigest, register, reason) {
  const policy = getRenewalPolicy(register);
  return {
    cat_id: def.cat_id,
    canonical_name: def.canonical_name,
    passport_id: passport && passport.passport_id ? passport.passport_id : (def.passport_id || null),
    current_expires_at_utc: passport ? (passport.expires_at_utc ?? null) : null,
    requested_ttl_days: policy.default_ttl_days,
    bundle_digest: bundleDigest,
    reason
  };
}

function getRenewalEligibility(passport, register) {
  if (!passport) {
    return { eligible: false, reason: null };
  }
  const expiresMs = Date.parse(passport.expires_at_utc);
  if (!Number.isFinite(expiresMs)) {
    return { eligible: true, reason: "expired" };
  }
  if (expiresMs <= Date.now()) {
    return { eligible: true, reason: "expired" };
  }
  const policy = getRenewalPolicy(register);
  const graceMs = Math.max(0, policy.renewal_grace_days) * 24 * 60 * 60 * 1000;
  return {
    eligible: (expiresMs - Date.now()) <= graceMs,
    reason: "expiring_soon"
  };
}

function verifyRegistryEntry(def, registry) {
  const namespaces = registry && typeof registry === "object" ? registry.namespaces : null;
  const canonical = typeof def.canonical_name === "string" ? def.canonical_name : "";
  const entry = namespaces && typeof namespaces === "object" ? namespaces[canonical] : null;
  if (!entry) {
    failWithCode(
      "REGISTRY_MISMATCH",
      `Registry mismatch for ${def.cat_id}: canonical_name '${canonical}' is not registered`
    );
  }
  if (entry.cat_id !== def.cat_id) {
    failWithCode(
      "REGISTRY_MISMATCH",
      `Registry mismatch for ${def.cat_id}: registry maps '${canonical}' to '${entry.cat_id}'`
    );
  }
  return entry;
}

function enforcePassportCrossVerification(def, registryEntry, register) {
  if (!registryEntry || !registryEntry.passport_required) return;

  const registryPassportId = typeof registryEntry.passport_id === "string"
    ? registryEntry.passport_id
    : "";
  if (!def.passport_id) {
    failWithCode(
      "PASSPORT_MISMATCH_REGISTRY_DEF",
      `Passport mismatch (registry<->def) for ${def.cat_id}: definition passport_id missing`
    );
  }
  if (!registryPassportId) {
    failWithCode(
      "PASSPORT_MISMATCH_REGISTRY_DEF",
      `Passport mismatch (registry<->def) for ${def.cat_id}: registry passport_id missing`
    );
  }
  if (registryPassportId !== def.passport_id) {
    failWithCode(
      "PASSPORT_MISMATCH_REGISTRY_DEF",
      `Passport mismatch (registry<->def) for ${def.cat_id}: registry '${registryPassportId}' != definition '${def.passport_id}'`
    );
  }

  if (!register || !Array.isArray(register.passports)) {
    failWithCode(
      "PASSPORT_MISMATCH_POLICE_REGISTRY",
      `Passport mismatch (police<->registry) for ${def.cat_id}: police register missing or invalid`
    );
  }

  const passport = register.passports.find((p) => p && p.passport_id === registryPassportId);
  if (!passport) {
    failWithCode(
      "PASSPORT_MISMATCH_POLICE_REGISTRY",
      `Passport mismatch (police<->registry) for ${def.cat_id}: passport '${registryPassportId}' not found`
    );
  }

  if (passport.canonical_name !== def.canonical_name) {
    failWithCode(
      "PASSPORT_MISMATCH_POLICE_REGISTRY",
      `Passport mismatch (police<->registry) for ${def.cat_id}: police canonical_name '${passport.canonical_name}' != registry '${def.canonical_name}'`
    );
  }

  if (passport.cat_id != null && String(passport.cat_id) !== String(def.cat_id)) {
    failWithCode(
      "PASSPORT_MISMATCH_POLICE_DEF",
      `Passport mismatch (police<->def) for ${def.cat_id}: police cat_id '${passport.cat_id}' != definition '${def.cat_id}'`
    );
  }
}

function hashBundle(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function verifyPassport(def, bundleDigest, register) {
  const base = {
    status: "UNVERIFIED",
    note: "Police register missing.",
    expires_at_utc: null,
    bundle_digest: bundleDigest
  };

  if (!register || !Array.isArray(register.passports)) return base;

  if (!def.passport_id) {
    return {
      status: "MISSING_ID",
      note: "CAT definition missing passport_id.",
      expires_at_utc: null,
      bundle_digest: bundleDigest
    };
  }

  const passport = register.passports.find((p) => p.passport_id === def.passport_id);
  if (!passport) {
    return {
      status: "MISSING",
      note: "Passport not found in police register.",
      expires_at_utc: null,
      bundle_digest: bundleDigest
    };
  }

  const result = {
    status: "OK",
    note: "Passport verified.",
    expires_at_utc: passport.expires_at_utc ?? null,
    bundle_digest: passport.bundle_digest ?? bundleDigest
  };

  if (passport.status !== "ACTIVE") {
    result.status = "INACTIVE";
    result.note = `Passport status ${passport.status || "MISSING"}.`;
    return result;
  }

  const expiresMs = Date.parse(passport.expires_at_utc);
  if (!Number.isFinite(expiresMs)) {
    result.status = "EXPIRED";
    result.note = "Passport expiry invalid.";
    return result;
  }

  if (expiresMs <= Date.now()) {
    result.status = "EXPIRED";
    result.note = "Passport expired.";
    return result;
  }

  if (typeof passport.bundle_digest !== "string") {
    result.status = "DIGEST_MISMATCH";
    result.note = "Passport bundle_digest missing.";
    return result;
  }

  if (passport.bundle_digest.toLowerCase() !== bundleDigest.toLowerCase()) {
    result.status = "DIGEST_MISMATCH";
    result.note = "Passport bundle_digest does not match definition.";
    return result;
  }

  return result;
}

function main() {
  let parsedArgs;
  try {
    parsedArgs = parseCliArgs(process.argv);
  } catch (err) {
    console.error(`${err.code || "CAT_DEMO_ARG_ERROR"}: ${err.message}`);
    process.exit(2);
  }

  const { catId, jsonArg, denyReason, renew } = parsedArgs;
  if (!catId) {
    console.error(
      "Usage: node run_cat_demo.cjs <RGPT-CAT-XX> [jsonInput] [--renew] [--deny expired|digest|registry|passport]"
    );
    process.exit(2);
  }
  let input;
  try {
    input = jsonArg ? JSON.parse(jsonArg) : { demo: true, ts: new Date().toISOString() };
  } catch (err) {
    console.error(`INVALID_JSON_INPUT: ${err.message}`);
    process.exit(2);
  }

  const root = repoRootFromHere();
  const registry = loadRegistryIndex(root);
  const cats = loadCats(root);
  const canonicalIndex = new Map();
  for (const cat of cats) {
    const canonical = cat.def.canonical_name;
    if (!canonical) continue;
    const key = String(canonical).toLowerCase();
    const existing = canonicalIndex.get(key);
    if (existing) {
      console.error(`Duplicate canonical_name: ${canonical} (also in ${existing})`);
      process.exit(5);
    }
    canonicalIndex.set(key, cat.filePath);
  }

  const entry = cats.find((c) => c.def.cat_id === catId);

  if (!entry) {
    console.error(`CAT not found: ${catId}`);
    process.exit(3);
  }

  const def = entry.def;
  const register = loadPoliceRegister(root);
  const bundleDigest = hashBundle(entry.raw);

  if (denyReason && !(renew && denyReason === "expired")) {
    const status = DEMO_DENY_STATUS_BY_REASON[denyReason];
    const passportVerification = {
      status,
      note: `Forced demo denial: ${denyReason}`,
      expires_at_utc: null,
      bundle_digest: bundleDigest
    };
    const payload = {
      ok: false,
      cat_id: def.cat_id,
      canonical_name: def.canonical_name,
      denial_reason: denyReason,
      passport_verification: passportVerification
    };
    console.error(`FORCED_DEMO_DENIAL_${status}: Forced demo denial: ${denyReason}`);
    console.log(JSON.stringify(payload, null, 2));
    process.exit(6);
  }

  let registryEntry;
  try {
    registryEntry = verifyRegistryEntry(def, registry);
    enforcePassportCrossVerification(def, registryEntry, register);
  } catch (err) {
    console.error(`${err.code || "CAT_DEMO_VERIFICATION_ERROR"}: ${err.message}`);
    process.exit(6);
  }
  const passportVerification = verifyPassport(def, bundleDigest, register);
  const passport = findPassportById(register, def.passport_id);

  if (renew) {
    if (denyReason === "expired") {
      const renewalRequest = buildRenewalRequest(def, passport, bundleDigest, register, "expired");
      console.log(JSON.stringify(renewalRequest, null, 2));
      process.exit(0);
    }

    if (passportVerification.status === "OK") {
      const renewalEligibility = getRenewalEligibility(passport, register);
      if (renewalEligibility.eligible) {
        const renewalRequest = buildRenewalRequest(
          def,
          passport,
          bundleDigest,
          register,
          renewalEligibility.reason || "expiring_soon"
        );
        console.log(JSON.stringify(renewalRequest, null, 2));
        process.exit(0);
      }
      console.log("Not eligible for renewal yet");
      process.exit(0);
    }

    if (passportVerification.status === "EXPIRED") {
      const renewalRequest = buildRenewalRequest(def, passport, bundleDigest, register, "expired");
      console.log(JSON.stringify(renewalRequest, null, 2));
      process.exit(0);
    }
  }

  const allowedSideEffectsDeclared = Array.isArray(def.allowed_side_effects)
    ? def.allowed_side_effects
    : [];
  const requiresPassport = Boolean(def.passport_required);
  const allowedSideEffectsEffective = (requiresPassport && passportVerification.status !== "OK")
    ? ["read_only"]
    : allowedSideEffectsDeclared;

  // Demo-safe scaffold output (Step 6 will wire into actual core-api execution + ledger)
  const output = {
    ok: true,
    cat_id: def.cat_id,
    canonical_name: def.canonical_name,
    name: def.name,
    entrypoint: def.entrypoint,
    runtime_mode: def.runtime_mode,
    requires_approval: def.requires_approval,
    passport_verification: passportVerification,
    allowed_side_effects_declared: allowedSideEffectsDeclared,
    allowed_side_effects_effective: allowedSideEffectsEffective,
    input,
    note: "CJS demo runner executed without TS/ESM runtime. Step-6 will connect to real execution + ledger envelope."
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
