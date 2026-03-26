#!/usr/bin/env bash
#===============================================
# Agent-Zero Upgrade Script
# Purpose: Merge upstream changes without clobbering custom work
#===============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
REPO_DIR="$(pwd)"
UPGRADE_DIR="$REPO_DIR/upgrade"
BACKUP_DIR="$UPGRADE_DIR/backup-custom"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

#===============================================
# Step 1: Verify prerequisites
#===============================================
log "=== Step 1: Prerequisites ==="

# Check we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Check upstream exists
git remote get-url upstream &>/dev/null || die "No upstream remote. Run: git remote add upstream https://github.com/agent0ai/agent-zero.git"
log "Upstream: $(git remote get-url upstream)"

# Fetch latest
log "Fetching upstream..."
git fetch upstream

# Check for uncommitted changes - must be clean
if [[ -n "$(git status --porcelain)" ]]; then
    log "WARNING: You have uncommitted changes:"
    git status --short
    read -p "Commit or stash them before continuing. Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || die "Aborted - commit or stash changes first"
fi

log "Prerequisites OK"

#===============================================
# Step 2: Create upgrade branch
#===============================================
log "=== Step 2: Create upgrade branch ==="

UPGRADE_BRANCH="upgrade-to-latest-$(date '+%Y%m%d')"

# Check if branch already exists
if git rev-parse --verify "$UPGRADE_BRANCH" &>/dev/null; then
    log "Branch $UPGRADE_BRANCH exists - using it"
    git checkout "$UPGRADE_BRANCH"
else
    git checkout -b "$UPGRADE_BRANCH" upstream/main
fi

log "On branch: $(git branch --show-current)"

#===============================================
# Step 3: Backup custom new files
#===============================================
log "=== Step 3: Backup custom files ==="

rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# List of new directories/files we added (relative to repo root)
NEW_DIRS="api extensions agents docs docs/specs"

for dir in $NEW_DIRS; do
    if [[ -d "$REPO_DIR/$dir" ]]; then
        log "Backing up $dir/"
        cp -r "$REPO_DIR/$dir" "$BACKUP_DIR/"
    fi
done

# Backup untracked custom files
log "Backing up untracked files..."
for f in redmine-mcp.env secrets.env settings.json; do
    if [[ -f "$REPO_DIR/$f" ]]; then
        cp -p "$REPO_DIR/$f" "$BACKUP_DIR/"
        log "Backacked $f"
    fi
done

log "Backup complete: $BACKUP_DIR"

#===============================================
# Step 4: Analyze changes
#===============================================
log "=== Step 4: Analyze changes ==="

log "Files changed from upstream: $(git diff --name-only upstream/main HEAD | wc -l)"
log "New files (not in upstream): $(comm -23 <(git ls-tree -r --name-only HEAD | sort) <(git ls-tree -r --name-only upstream/main | sort) | wc -l)"

# Save change lists for review
git diff --name-only upstream/main HEAD > "$UPGRADE_DIR/changed-files.txt"
comm -23 <(git ls-tree -r --name-only HEAD | sort) <(git ls-tree -r --name-only upstream/main | sort) > "$UPGRADE_DIR/new-files-only.txt"

log "Change analysis saved to upgrade/changed-files.txt and upgrade/new-files-only.txt"

#===============================================
# Step 5: Show files needing manual review
#===============================================
log "=== Step 5: Manual review required ==="

log "The following modified files need manual review after copy:"
git diff --name-only upstream/main HEAD | grep -E "^(conf/|docker/|webui/|extensions/)" | head -20

echo ""
log "Review the upgrade/UPGRADE.md for detailed merge instructions"

#===============================================
# Step 6: Summary
#===============================================
log "=== Step 6: Next Steps ==="
cat << 'EOF'

Upgrade branch created: upgrade-to-latest-YYYYMMDD

To complete the upgrade:

1. Review the upgrade plan:
   cat upgrade/UPGRADE.md

2. The script has prepared the branch. Now manually:
   - Copy new api/ files from upgrade/backup-custom/
   - Copy new extensions/ files from upgrade/backup-custom/
   - Review and merge modified files (conf/, docker/, webui/, extensions/)
   - Copy untracked files (secrets.env, settings.json, etc.)

3. Test in dev container:
   docker/run/docker-compose.dev.yml up --build

4. If tests pass, merge to working branch:
   git checkout codex/throughput-metrics-development
   git merge upgrade-to-latest-YYYYMMDD

5. If tests fail, discard:
   git checkout codex/throughput-metrics-development
   git branch -D upgrade-to-latest-YYYYMMDD

EOF
