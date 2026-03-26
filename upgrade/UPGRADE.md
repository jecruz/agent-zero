# Agent-Zero Upgrade Plan

## Current State (as of 2026-03-26)

- **Current branch**: `codex/throughput-metrics-development`
- **Upstream**: `upstream/main`
- **Commits ahead of upstream**: ~600+
- **Files changed**: 536
- **New files (not in upstream)**: 415

## Custom Changes Summary

### New Files (415 total)
| Category | Count | Priority |
|----------|-------|----------|
| api/ | 74 | HIGH |
| extensions/ | 73 | HIGH |
| agents/ | 5 | HIGH |
| webui/ | 17 | MEDIUM |
| docs/ | 5 | LOW |
| other/ | 241 | VARIES |

### Modified Files (536 total)
| Category | Count | Priority |
|----------|-------|----------|
| webui/ | 72 | MEDIUM |
| extensions/ | ~50 | HIGH |
| api/ | ~30 | HIGH |
| docker/ | ~10 | HIGH |
| conf/ | ~5 | MEDIUM |

## Upgrade Strategy: Branch-and-Cherry-Pick

### Why This Approach?
- **Safest**: Doesn't touch your working branch
- **Reviewable**: Each change is explicit
- **Reversible**: If something breaks, discard the upgrade branch
- **Repeatable**: Script can be run again for future upgrades

---

## Step 1: Create Upgrade Branch

```bash
cd /Users/jeffreycruz/Development/agent-zero

# Create clean upgrade branch from upstream
git fetch upstream
git checkout -b upgrade-to-latest upstream/main

# Verify it's clean
git status  # Should show "nothing to commit, working tree clean"
```

---

## Step 2: Create Backup of Custom Files

```bash
# Create backup directory
mkdir -p upgrade/backup-custom

# Copy ALL new directories (these are safe - no conflicts possible)
cp -r api upgrade/backup-custom/ 2>/dev/null || true
cp -r extensions upgrade/backup-custom/ 2>/dev/null || true
cp -r agents upgrade/backup-custom/ 2>/dev/null || true
cp -r docs upgrade/backup-custom/ 2>/dev/null || true

# List what we backed up
echo "=== Backed up new files ==="
ls upgrade/backup-custom/
```

---

## Step 3: Apply Changes in Priority Order

### 3a. Copy NEW api/ files (74 files)
```bash
# These are entirely new - copy directly
cp -r upgrade/backup-custom/api/* api/

# Verify
ls api/
```

### 3b. Copy NEW extensions/ files (73 files)
```bash
cp -r upgrade/backup-custom/extensions/* extensions/

# Verify
ls extensions/
```

### 3c. Copy NEW agents/ files (5 files)
```bash
cp -r upgrade/backup-custom/agents/* agents/

# Verify
ls agents/
```

### 3d. Review and merge MODIFIED docker/run/docker-compose.yml
```bash
# Check what changed
git diff upstream/main..HEAD -- docker/run/docker-compose.yml

# If changes are additive (new env vars, volumes), manually merge
# If changes are structural, need careful review
```

### 3e. Review and merge MODIFIED conf/ files
```bash
# Check what changed in conf/
git diff upstream/main..HEAD -- conf/

# Manual review recommended for:
# - conf/model_providers.yaml (provider additions)
# - conf/agent.yaml (any new settings)
```

### 3f. Review and merge MODIFIED extensions/ (~50 files)
```bash
# These are critical - review each
git diff upstream/main..HEAD -- extensions/

# Priority files:
# - extensions/python/reasoning_stream/_10_log_from_stream.py
# - extensions/python/response_stream/_10_log_from_stream.py
# - extensions/python/tokens_stream_chunk/
```

### 3g. Review and merge MODIFIED webui/ (72 files)
```bash
# WebUI changes need visual testing
git diff upstream/main..HEAD -- webui/

# Key files to review:
# - webui/components/chat/input/* (input changes)
# - webui/components/sidebar/bottom/preferences/* (settings)
# - webui/js/messages.js (message handling)
# - webui/css/*.css (styles)
```

---

## Step 4: Copy Untracked (Working Tree) Files

These files exist only in working tree, not in any commit:

```bash
# Critical custom files
cp -p api/chat_stop.py api/
cp -p docker/run/DOCKER_DEV.md docker/run/
cp -p docker/run/docker-compose.dev.yml docker/run/
cp -p docker/run/agent-zero/ docker/run/
cp -p docs/specs/ docs/
cp -p extensions/python/tokens_stream_chunk/ extensions/python/
cp -p redmine-mcp.env .
cp -p secrets.env .
cp -p settings.json .

# Verify
ls -la *.env *.json 2>/dev/null
```

---

## Step 5: Test in Dev Container

```bash
# Start dev container
cd docker/run
docker compose -f docker-compose.dev.yml up --build

# Or if using main compose with dev profile
docker compose -f docker-compose.yml --profile dev up --build

# Test:
# 1. WebUI loads correctly
# 2. API endpoints respond
# 3. Chat works
# 4. Extensions load
# 5. Plugins work
```

---

## Step 6: If Tests Pass - Merge to Working Branch

```bash
# Switch back to working branch
git checkout codex/throughput-metrics-development

# Merge upgrade branch
git merge upgrade-to-latest --no-ff

# Push
git push origin codex/throughput-metrics-development
```

---

## Step 7: If Tests Fail - Discard and Keep Working

```bash
# Switch back to working branch (no changes)
git checkout codex/throughput-metrics-development

# Delete failed upgrade branch
git branch -D upgrade-to-latest

# You're back to where you started - no harm done
```

---

## Rollback Checklist

If something goes wrong:

- [ ] Working branch is unchanged
- [ ] All backups are in `upgrade/backup-custom/`
- [ ] Can start fresh with `git checkout -b upgrade-to-latest upstream/main`

---

## Notes

### What's Already Working
- Agent Zero intake (Telegram bridge) ✓
- Redmine MCP integration ✓
- Custom API endpoints ✓
- Throughput metrics ✓

### What Needs Testing After Upgrade
- [ ] WebUI renders correctly
- [ ] Plugin marketplace loads
- [ ] Chat API works
- [ ] Memory integration
- [ ] All extensions functional

### Next Steps After Successful Upgrade
1. Update any deprecated config keys
2. Update docs/specs/ with new features
3. Test all agents (agent0, forge, kleo, talon)
4. Verify Telegram bridge still works
