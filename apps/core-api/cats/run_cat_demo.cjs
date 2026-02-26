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
  const catId = process.argv[2];
  if (!catId) {
    console.error("Usage: node run_cat_demo.cjs <RGPT-CAT-XX> [jsonInput]");
    process.exit(2);
  }

  const jsonArg = process.argv[3];
  const input = jsonArg ? JSON.parse(jsonArg) : { demo: true, ts: new Date().toISOString() };

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
  let registryEntry;
  try {
    registryEntry = verifyRegistryEntry(def, registry);
    enforcePassportCrossVerification(def, registryEntry, register);
  } catch (err) {
    console.error(`${err.code || "CAT_DEMO_VERIFICATION_ERROR"}: ${err.message}`);
    process.exit(6);
  }
  const bundleDigest = hashBundle(entry.raw);
  const passportVerification = verifyPassport(def, bundleDigest, register);
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
