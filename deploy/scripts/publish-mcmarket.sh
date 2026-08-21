#!/usr/bin/env bash
# Publishes/updates the MCMarket plugin (the Paper client itself) as a
# listing on this marketplace, so /mcmarket update self and the in-game
# "Update MCMarket Itself" button always have something to check against.
# Idempotent: safe to re-run after every plugin-paper build. Only actually
# uploads a new version when plugin-paper's pom.xml version isn't already
# published.
#
# Requires: curl, jq.
#
# Usage (run from the repo root, on the machine with API access):
#   MC_API_URL=https://mc-api.corelabs.network \
#   MC_ADMIN_USER=youradmin \
#   MC_ADMIN_PASS=yourpassword \
#   bash deploy/scripts/publish-mcmarket.sh
#
# MC_ADMIN_USER must already be an admin (see docs.md "Moderation & roles"
# for the SQL to promote one). Credentials are read from the environment
# only - never hardcode them here or pass them as a literal argument (bash
# history / process list would leak them).

set -euo pipefail

API_URL="${MC_API_URL:-http://localhost:8080}"
ADMIN_USER="${MC_ADMIN_USER:?Set MC_ADMIN_USER to an admin account username}"
ADMIN_PASS="${MC_ADMIN_PASS:?Set MC_ADMIN_PASS to the password for that account}"
SLUG="${MC_SELF_SLUG:-mcmarket}"
JAR_PATH="${MC_JAR_PATH:-$(dirname "$0")/../../plugin-paper/target/mcmarket-plugin.jar}"
POM_PATH="$(dirname "$0")/../../plugin-paper/pom.xml"
MC_MIN="${MC_MIN:-1.21}"
MC_MAX="${MC_MAX:-1.26.2}"

if ! command -v jq >/dev/null; then
  echo "jq is required (apt-get install -y jq)" >&2
  exit 1
fi
if [ ! -f "$JAR_PATH" ]; then
  echo "Jar not found at $JAR_PATH - build plugin-paper first (mvn -DskipTests package)" >&2
  exit 1
fi

VERSION=$(grep -m1 -oP '(?<=<version>)[^<]+' "$POM_PATH")
echo "Publishing MCMarket $VERSION as slug '$SLUG' to $API_URL"

COOKIES=$(mktemp)
trap 'rm -f "$COOKIES"' EXIT

login_status=$(curl -sS -o /tmp/mcmarket-login.json -w '%{http_code}' -c "$COOKIES" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  "$API_URL/v1/auth/login")
if [ "$login_status" != "200" ] && [ "$login_status" != "201" ]; then
  echo "Login failed (HTTP $login_status): $(cat /tmp/mcmarket-login.json)" >&2
  exit 1
fi
role=$(jq -r '.role // empty' /tmp/mcmarket-login.json)
if [ "$role" != "admin" ]; then
  echo "MC_ADMIN_USER '$ADMIN_USER' is not an admin (role: '$role'). Promote it first - see docs.md." >&2
  exit 1
fi
rm -f /tmp/mcmarket-login.json

get_status=$(curl -sS -o /tmp/mcmarket-plugin.json -w '%{http_code}' -b "$COOKIES" "$API_URL/v1/plugins/$SLUG")
if [ "$get_status" = "404" ]; then
  echo "Plugin '$SLUG' doesn't exist yet - creating it."
  create_status=$(curl -sS -o /tmp/mcmarket-plugin.json -w '%{http_code}' -b "$COOKIES" \
    -H 'Content-Type: application/json' \
    -d '{"name":"MCMarket","summary":"In-game client for this marketplace - browse, install, and update plugins from an inventory GUI.","description":"MCMarket is the companion Paper plugin for this marketplace. It gives server admins an in-game inventory GUI to browse every plugin, install/update them, and keep this client itself current - no manual jar juggling.","category_id":null,"tags":["official","marketplace-client"]}' \
    "$API_URL/v1/plugins")
  if [ "$create_status" != "201" ]; then
    echo "Create failed (HTTP $create_status): $(cat /tmp/mcmarket-plugin.json)" >&2
    exit 1
  fi
elif [ "$get_status" != "200" ]; then
  echo "Unexpected status checking plugin (HTTP $get_status): $(cat /tmp/mcmarket-plugin.json)" >&2
  exit 1
fi
rm -f /tmp/mcmarket-plugin.json

approve_status=$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIES" -X POST "$API_URL/v1/admin/plugins/$SLUG/approve")
if [ "$approve_status" != "200" ]; then
  echo "Warning: approve returned HTTP $approve_status (continuing - it may already be approved)" >&2
fi

versions_json=$(curl -sS -b "$COOKIES" "$API_URL/v1/plugins/$SLUG/versions")
already_published=$(echo "$versions_json" | jq -r --arg v "$VERSION" '.versions[] | select(.version == $v) | .version' | head -1)
if [ -n "$already_published" ]; then
  echo "Version $VERSION is already published for '$SLUG'. Nothing to upload."
  exit 0
fi

echo "Uploading version $VERSION..."
upload_status=$(curl -sS -o /tmp/mcmarket-version.json -w '%{http_code}' -b "$COOKIES" \
  -F "version=$VERSION" \
  -F "changelog=Automated publish of MCMarket $VERSION." \
  -F "mc_version_min=$MC_MIN" \
  -F "mc_version_max=$MC_MAX" \
  -F "loaders=paper,spigot,bukkit" \
  -F "file=@${JAR_PATH};type=application/java-archive" \
  "$API_URL/v1/plugins/$SLUG/versions")
if [ "$upload_status" != "201" ]; then
  echo "Upload failed (HTTP $upload_status): $(cat /tmp/mcmarket-version.json)" >&2
  exit 1
fi
status=$(jq -r '.status' /tmp/mcmarket-version.json)
rm -f /tmp/mcmarket-version.json
echo "Published. Version status: $status"
if [ "$status" != "approved" ]; then
  echo "Not auto-approved (scan pipeline may be disabled or flagged it) - check /admin or the scan_jobs table."
fi
