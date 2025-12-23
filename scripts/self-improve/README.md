# Self-Improve Scripts - Safety Model

## Overview

These scripts support RocketGPT's self-improvement subsystem. All scripts follow strict safety guidelines to prevent unauthorized code modifications.

**Last Audited**: 2025-12-23
**Safety Status**: ✅ All scripts safe for use

---

## Script Inventory

### 1. execute.js

**Purpose**: Execute improvement proposals (currently in simulation mode)

**Safety Level**: ✅ **SAFE** (Documentation only)

**Current Behavior**:
- Reads improvement context from env vars or `selected.json`
- Reads chat intents from `config/self-improve/chat_intents.jsonl`
- Generates markdown plan document (preview mode)
- Optionally writes plan to `docs/self-improve/chat-intent-plan.md`

**Safety Features**:
- ✅ Read-only by default (simulation mode)
- ✅ Gated write: Requires `SELF_IMPROVE_WRITE_PLAN=true` env flag
- ✅ Only writes documentation (markdown files)
- ✅ Does NOT modify code
- ✅ Does NOT execute shell commands
- ✅ Does NOT apply patches

**Usage**:
```bash
# Preview mode (read-only)
node scripts/self-improve/execute.js

# With dry-run flag (explicit)
node scripts/self-improve/execute.js --dry-run

# Allow doc write (still safe - only writes markdown)
SELF_IMPROVE_WRITE_PLAN=true node scripts/self-improve/execute.js
```

**Risk Assessment**: **LOW**
- Can only write to `docs/self-improve/` directory
- Only creates markdown files (not executable code)
- Requires explicit env flag to write

**Audit Date**: 2025-12-23
**Auditor**: Claude Sonnet 4.5
**Status**: Approved for use

---

### 2. patcher.js

**Purpose**: Apply improvement patches (placeholder/stub)

**Safety Level**: ✅ **SAFE** (Stub only - no functionality)

**Current Behavior**:
- Reads improvement context from env vars
- Logs context for debugging
- Exits with code 0 (success)
- **Does NOT generate patches**
- **Does NOT apply patches**
- **Does NOT modify any files**

**Safety Features**:
- ✅ Explicitly marked as placeholder (line 3-8)
- ✅ No file writes
- ✅ No shell command execution
- ✅ No code modifications
- ✅ Safe to run in any environment

**Usage**:
```bash
# Safe to run (does nothing)
node scripts/self-improve/patcher.js
```

**Risk Assessment**: **NONE**
- Completely inert placeholder
- Future implementation will require:
  - Dry-run mode
  - Approval gates
  - Limited scope (docs/tests only initially)
  - Human review before applying patches

**Audit Date**: 2025-12-23
**Auditor**: Claude Sonnet 4.5
**Status**: Approved for use (stub only)

---

### 3. read_chat_intents.js

**Purpose**: Read chat intent logs

**Safety Level**: ✅ **SAFE** (Read-only)

**Behavior**:
- Reads `config/self-improve/chat_intents.jsonl`
- Parses and returns intent data
- No writes, no modifications

**Risk Assessment**: **NONE** (read-only utility)

---

### 4. select_next.js

**Purpose**: Select next improvement from backlog

**Safety Level**: ⚠️ **NEEDS REVIEW**

**Status**: Not yet audited

---

### 5. write_status.js

**Purpose**: Write status updates

**Safety Level**: ⚠️ **NEEDS REVIEW**

**Status**: Not yet audited
**Concern**: Name suggests write operations - needs audit

---

### 6. self_improve_*.ps1 (PowerShell scripts)

**Purpose**: Various PowerShell utilities

**Safety Level**: ⚠️ **NEEDS REVIEW**

**Status**: Not yet audited

---

## Safety Guardrails

### Script Execution Policy

**Before running any self-improve script:**

1. ✅ Script has been audited (check this doc)
2. ✅ Script has documented safety features
3. ✅ Script respects dry-run mode (or is read-only)
4. ✅ Script does not modify code without approval
5. ✅ Script logs all operations

### Approval Requirements

**Scripts that can write files require:**

- [ ] Audit by 2+ team members
- [ ] Documented safety features
- [ ] Dry-run mode implemented
- [ ] Gated by env flag (default safe)
- [ ] Limited scope (docs/tests only initially)

**Scripts that can modify code require:**

- [ ] All of the above, plus:
- [ ] Integration with approval workflow
- [ ] Human review before application
- [ ] Rollback plan documented
- [ ] Safe-mode integration

### Future Implementation Guidelines

When implementing real patching logic:

1. **Phase 1: Docs Only**
   - Only modify markdown files in `docs/`
   - Require env flag: `SELF_IMPROVE_ALLOW_DOCS=true`
   - Generate PR for review

2. **Phase 2: Tests Only**
   - Add ability to modify test files
   - Require env flag: `SELF_IMPROVE_ALLOW_TESTS=true`
   - Generate PR for review

3. **Phase 3: Code (Future)**
   - Require env flag: `SELF_IMPROVE_ALLOW_CODE=true`
   - Require explicit approval workflow
   - Never auto-merge
   - Limited to specific file patterns

---

## Dry-Run Mode

All scripts that can write files **must** support `--dry-run`:

```bash
# Dry-run mode: preview changes without writing
node scripts/self-improve/execute.js --dry-run

# Normal mode: respects env flags
node scripts/self-improve/execute.js
```

**Dry-run behavior:**
- Preview all changes
- Log what would be written
- Exit without modifying files
- Return success (0) or failure (1) based on validation

---

## Environment Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `SELF_IMPROVE_WRITE_PLAN` | `false` | Allow execute.js to write plan docs |
| `SELF_IMPROVE_ALLOW_DOCS` | `false` | (Future) Allow doc modifications |
| `SELF_IMPROVE_ALLOW_TESTS` | `false` | (Future) Allow test modifications |
| `SELF_IMPROVE_ALLOW_CODE` | `false` | (Future) Allow code modifications |

**All flags default to `false` for safety.**

---

## Audit Log

| Date | Script | Auditor | Status | Notes |
|------|--------|---------|--------|-------|
| 2025-12-23 | execute.js | Claude Sonnet 4.5 | ✅ Safe | Doc-only, gated by env flag |
| 2025-12-23 | patcher.js | Claude Sonnet 4.5 | ✅ Safe | Stub only, no functionality |
| 2025-12-23 | read_chat_intents.js | Claude Sonnet 4.5 | ✅ Safe | Read-only utility |

---

## Contact

**Security Concerns**: File issue with label `security`
**Questions**: See `CLAUDE.md` for project leads

---

**Version**: 1.0
**Last Updated**: 2025-12-23
