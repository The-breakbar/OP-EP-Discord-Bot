#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/discord-bot"
BOT_USER="bot"
SERVICE="discord-bot"
BRANCH="main"

# Run a command as the bot user
as_user() { runuser -u "$BOT_USER" -- "$@"; }

GIT="git -C $REPO_DIR"

as_user $GIT fetch --quiet origin "$BRANCH"

LOCAL="$(as_user $GIT rev-parse HEAD)"
REMOTE="$(as_user $GIT rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
	echo "Already up to date ($LOCAL)."
	exit 0
fi

echo "New commit on $BRANCH: ${LOCAL:0:8} -> ${REMOTE:0:8}"

if as_user $GIT diff --name-only "$LOCAL" "$REMOTE" | grep -qE '^(package\.json|package-lock\.json)$'; then
	DEPS_CHANGED=1
else
	DEPS_CHANGED=0
fi

as_user $GIT reset --hard "origin/$BRANCH"

if [ "$DEPS_CHANGED" = "1" ]; then
	echo "Dependencies changed, running npm ci"
	as_user bash -c "cd '$REPO_DIR' && npm ci --omit=dev"
fi

systemctl restart "$SERVICE"
echo "Deployed ${REMOTE:0:8} and restarted $SERVICE"
