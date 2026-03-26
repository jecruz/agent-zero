# Agent Upgrade Task

## Context
You are performing an upgrade of the agent-zero fork to the latest upstream version. The fork has significant customizations that must be preserved. Follow the upgrade plan exactly.

## Your Task

### Step 0: PRESERVE LOCAL CHANGES (CRITICAL)

Before doing ANYTHING else, protect uncommitted local changes:

```bash
# Check for uncommitted changes
git status

# If there are modified files (not staged), stash them
git stash push -m "upgrade-prep: local changes before upgrade"

# If there are untracked files (new files in working tree), copy them to backup
# Untracked files are LOST if you switch branches without saving them
for f in $(git status --porcelain | grep "^??" | awk '{print $2}'); do
    cp -r "$f" "upgrade/backup-untracked/"
done

# Verify no local changes remain
git status  # Should show "nothing to commit, working tree clean"
```

**IMPORTANT**: Untracked files (files with `??` in git status) exist ONLY in your working tree. They are NOT in any commit. If you switch branches without copying them, they will be LOST forever.

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
# Commit the upgrade changes
git add -A
git commit -m "feat: upgrade to upstream/latest"

# Restore any stashed changes from the original branch
git stash list  # Check if anything was stashed
git stash pop   # Restore stashed changes (if any)

# Push
git push origin upgrade-to-latest
```

### Step 9: If tests fail — stop and report
```
DO NOT commit.
Report what failed and what needs fixing.
```

## Critical Rules

1. **Step 0 FIRST** — Always preserve local changes before touching anything else
2. **Untracked files are LOST on branch switch** — Copy them to backup before switching branches
3. **Stash before switching** — `git stash` any modified working files before creating upgrade branch
4. **Test after each priority step** — don't wait until the end to test
5. **Document every manual change** — note what you changed and why
6. **Report blockers immediately** — don't try to work around issues silently
7. **Preserve docker-compose.dev.yml** — it is actively used for UI development
8. **Restore stashed changes after testing** — `git stash pop` once upgrade is stable

## Backup Location
All custom files are backed up in:
```
upgrade/backup-custom/
```

Additionally, untracked working files (not yet committed) are saved to:
```
upgrade/backup-untracked/
```

## Current Uncommitted Changes (as of 2026-03-26)

The following modified files exist in the working tree (not committed):
```
conf/model_providers.yaml
docker/run/docker-compose.yml
extensions/python/reasoning_stream/_10_log_from_stream.py
extensions/python/response_stream/_10_log_from_stream.py
webui/components/chat/input/bottom-actions.html
webui/components/chat/input/chat-bar-input.html
webui/components/chat/input/input-store.js
webui/components/messages/action-buttons/simple-action-buttons.js
webui/components/sidebar/bottom/preferences/preferences-panel.html
webui/components/sidebar/bottom/preferences/preferences-store.js
webui/css/messages.css
webui/index.css
webui/index.js
webui/js/messages.js
webui/js/time-utils.js
```

The following untracked files also exist (not in git at all):
```
api/chat_stop.py
docker/run/DOCKER_DEV.md
docker/run/docker-compose.dev.yml
docker/run/agent-zero/
docs/specs/
extensions/python/tokens_stream_chunk/
redmine-mcp.env
secrets.env
settings.json
```

These are preserved via the backup process. The upgrade branch will have access to them after copying from backup.

## Upstream Info
- **Upstream repo**: https://github.com/agent0ai/agent-zero.git
- **Upstream branch**: upstream/main
- **Fork repo**: https://github.com/jecruz/agent-zero.git
- **Working branch**: codex/throughput-metrics-development
