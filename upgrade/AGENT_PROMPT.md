# Agent Upgrade Task

## Context
You are performing an upgrade of the agent-zero fork to the latest upstream version. The fork has significant customizations that must be preserved. Follow the upgrade plan exactly.

## Your Task

### Step 1: Read the upgrade plan
```
Read: upgrade/UPGRADE.md
```
Follow every step in order. Do not skip steps.

### Step 2: Create upgrade branch
```bash
git fetch upstream
git checkout -b upgrade-to-latest upstream/main
```
Verify with `git status` — should be clean.

### Step 3: Review changed files
Read these files to understand what needs merging:
```
upgrade/all-changed-files.txt     # All 536 changed files
upgrade/new-only-to-branch.txt   # 415 new files (safe to copy)
upgrade/mod-webui.txt            # 72 modified webui files
upgrade/patch-extensions.diff    # 73KB of extension changes
upgrade/patch-api.diff          # 159KB of API changes
```

### Step 4: Apply changes in priority order

**Priority 1 — Copy new directories (no conflicts possible):**
```bash
# Copy these entirely from the working branch:
cp -r api/ upgrade/backup-custom/api/
cp -r extensions/ upgrade/backup-custom/extensions/
cp -r agents/ upgrade/backup-custom/agents/
cp -r docs/ upgrade/backup-custom/docs/
```

**Priority 2 — Review and merge modified extensions:**
```bash
# Read each changed extension file and apply manually:
git show HEAD:extensions/python/reasoning_stream/_10_log_from_stream.py
git show upstream/main:extensions/python/reasoning_stream/_10_log_from_stream.py
# Apply your custom changes to the upstream version
```

**Priority 3 — Review modified webui files:**
```bash
# WebUI changes need careful review
# Test each component after applying
```

**Priority 4 — Merge config files:**
```bash
# These are typically safe to copy if additions only:
cp upgrade/backup-custom/conf/model_providers.yaml conf/
```

### Step 5: Copy untracked working files
```bash
# These exist only in working tree, not in any commit:
cp -p upgrade/backup-custom/secrets.env .
cp -p upgrade/backup-custom/settings.json .
cp -p upgrade/backup-custom/redmine-mcp.env .
```

### Step 6: Test in dev container
```bash
cd docker/run
docker compose -f docker-compose.dev.yml up --build

# Test checklist:
# [ ] WebUI loads at http://localhost:50080
# [ ] API responds at /api/chat
# [ ] Chat works end-to-end
# [ ] Extensions load without errors
# [ ] Plugin marketplace loads
# [ ] Memory integration works
```

### Step 7: Report status
Report:
- Files successfully merged
- Files that need manual review
- Any errors or conflicts encountered
- Test results from dev container

### Step 8: If tests pass — commit
```bash
git add -A
git commit -m "feat: upgrade to upstream/latest"
git push origin upgrade-to-latest
```

### Step 9: If tests fail — stop and report
```
DO NOT commit.
Report what failed and what needs fixing.
```

## Critical Rules

1. **Never overwrite custom work** — always copy from backup, never delete first
2. **Test after each priority step** — don't wait until the end to test
3. **Document every manual change** — note what you changed and why
4. **Report blockers immediately** — don't try to work around issues silently
5. **Preserve docker-compose.dev.yml** — it is actively used for UI development

## Backup Location
All custom files are backed up in:
```
upgrade/backup-custom/
```

## Upstream Info
- **Upstream repo**: https://github.com/agent0ai/agent-zero.git
- **Upstream branch**: upstream/main
- **Fork repo**: https://github.com/jecruz/agent-zero.git
- **Working branch**: codex/throughput-metrics-development
