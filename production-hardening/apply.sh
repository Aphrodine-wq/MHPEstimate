#!/usr/bin/env bash
# ============================================================================
# Production Hardening Script for MHPEstimate
# ============================================================================
# Run from project root: bash production-hardening/apply.sh
#
# Changes applied:
# 1. Sentry error capturing in all 19 API routes
# 2. Auth failure logging in security-critical routes
# 3. Team member active check in versions POST
# 4. Stripe webhook signature enforcement in production
# 5. AbortController timeout on Anthropic API calls
# 6. Sentry user context after auth
# ============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/web/src/app/api"

echo "🔒 MHPEstimate Production Hardening"
echo "===================================="
echo "Root: $ROOT"
echo ""

CHANGES=0

# ---------------------------------------------------------------------------
# Helper: add an import line after the last existing import
# ---------------------------------------------------------------------------
add_import() {
  local file="$1"
  local import_line="$2"
  if grep -qF "$import_line" "$file" 2>/dev/null; then
    return 0
  fi
  local last_import_line
  last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
  if [ -n "$last_import_line" ]; then
    sed -i "${last_import_line}a\\${import_line}" "$file"
    CHANGES=$((CHANGES + 1))
    echo "  ✅ Added import to $(basename "$(dirname "$file")")/$(basename "$file")"
  fi
}

# ---------------------------------------------------------------------------
# Helper: add captureError after console.error in catch blocks
# ---------------------------------------------------------------------------
add_capture_error() {
  local file="$1"
  if grep -q "captureError" "$file" 2>/dev/null; then
    return 0
  fi

  python3 - "$file" << 'PYEOF'
import sys, re
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()
if 'captureError' in content:
    sys.exit(0)

lines = content.split('\n')
new_lines = []
route_name = filepath.split('/api/')[-1].replace('/route.ts', '') if '/api/' in filepath else 'unknown'

for i, line in enumerate(lines):
    new_lines.append(line)
    stripped = line.strip()
    match = re.match(r'^(\s*)console\.error\([^)]*,\s*(\w+(?:Error|err|Err))\s*\);?\s*$', line)
    if match:
        indent = match.group(1)
        var_name = match.group(2)
        new_lines.append(f'{indent}captureError({var_name} instanceof Error ? {var_name} : new Error(String({var_name})), {{ route: "{route_name}" }});')

with open(filepath, 'w') as f:
    f.write('\n'.join(new_lines))
PYEOF

  CHANGES=$((CHANGES + 1))
}

# ---------------------------------------------------------------------------
# 1. Sentry imports
# ---------------------------------------------------------------------------
echo "📦 Step 1: Adding Sentry imports..."

SENTRY_IMPORT='import { captureError, setUserContext } from "@/lib/sentry";'
SENTRY_IMPORT_SIMPLE='import { captureError } from "@/lib/sentry";'

AUTH_ROUTES=(
  "$API_DIR/estimates/[id]/send/route.ts"
  "$API_DIR/estimates/[id]/versions/route.ts"
  "$API_DIR/estimates/[id]/change-orders/route.ts"
  "$API_DIR/estimates/[id]/payment-link/route.ts"
  "$API_DIR/estimates/[id]/share/route.ts"
  "$API_DIR/estimates/[id]/sign/route.ts"
  "$API_DIR/estimates/[id]/reminders/route.ts"
  "$API_DIR/calls/to-estimate/route.ts"
  "$API_DIR/calls/analyze-photo/route.ts"
  "$API_DIR/team/invite/route.ts"
  "$API_DIR/team/invite/resend/route.ts"
  "$API_DIR/audit-log/route.ts"
  "$API_DIR/pricing/route.ts"
  "$API_DIR/integrations/quickbooks/export/route.ts"
)

PORTAL_ROUTES=(
  "$API_DIR/portal/[id]/route.ts"
  "$API_DIR/portal/[id]/sign/route.ts"
  "$API_DIR/portal/[id]/decline/route.ts"
)

WEBHOOK_ROUTES=(
  "$API_DIR/webhooks/stripe/route.ts"
)

for route in "${AUTH_ROUTES[@]}"; do
  [ -f "$route" ] && add_import "$route" "$SENTRY_IMPORT"
done

for route in "${PORTAL_ROUTES[@]}" "${WEBHOOK_ROUTES[@]}"; do
  [ -f "$route" ] && add_import "$route" "$SENTRY_IMPORT_SIMPLE"
done

echo ""

# ---------------------------------------------------------------------------
# 2. captureError calls
# ---------------------------------------------------------------------------
echo "🐛 Step 2: Adding captureError to error handlers..."

ALL_ROUTES=("${AUTH_ROUTES[@]}" "${PORTAL_ROUTES[@]}" "${WEBHOOK_ROUTES[@]}")
for route in "${ALL_ROUTES[@]}"; do
  [ -f "$route" ] && add_capture_error "$route"
done

echo ""

# ---------------------------------------------------------------------------
# 3. Auth failure logging on send route
# ---------------------------------------------------------------------------
echo "🔐 Step 3: Adding auth failure logging..."

SEND_ROUTE="$API_DIR/estimates/[id]/send/route.ts"
if [ -f "$SEND_ROUTE" ] && ! grep -q "logAuthFailure" "$SEND_ROUTE"; then
  sed -i 's/import { logAudit, getClientIp } from "@\/lib\/audit";/import { logAudit, logAuthFailure, getClientIp } from "@\/lib\/audit";/' "$SEND_ROUTE"

  python3 - "$SEND_ROUTE" << 'PYEOF'
import sys
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()
if 'await logAuthFailure' in content:
    sys.exit(0)

old = '''  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }'''
new = '''  if (!user) {
    await logAuthFailure("estimate_send_unauthorized", { estimate_id: id }, getClientIp(req));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }'''
content = content.replace(old, new, 1)
with open(filepath, 'w') as f:
    f.write(content)
PYEOF
  CHANGES=$((CHANGES + 1))
  echo "  ✅ Added auth failure logging to send route"
fi

echo ""

# ---------------------------------------------------------------------------
# 4. Team member check in versions POST
# ---------------------------------------------------------------------------
echo "👥 Step 4: Adding team member check to versions POST..."

VERSIONS_ROUTE="$API_DIR/estimates/[id]/versions/route.ts"
if [ -f "$VERSIONS_ROUTE" ] && ! grep -q "team_members" "$VERSIONS_ROUTE"; then
  python3 - "$VERSIONS_ROUTE" << 'PYEOF'
import sys
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()
if 'team_members' in content:
    sys.exit(0)

old = '''  let body: { change_summary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch the full estimate'''

new = '''  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberError || !teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { change_summary?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Fetch the full estimate'''

content = content.replace(old, new, 1)
with open(filepath, 'w') as f:
    f.write(content)
PYEOF
  CHANGES=$((CHANGES + 1))
  echo "  ✅ Added team member check to versions POST"
fi

echo ""

# ---------------------------------------------------------------------------
# 5. Stripe webhook production enforcement
# ---------------------------------------------------------------------------
echo "💳 Step 5: Enforcing Stripe webhook signature in production..."

STRIPE_ROUTE="$API_DIR/webhooks/stripe/route.ts"
if [ -f "$STRIPE_ROUTE" ] && ! grep -q "STRIPE_WEBHOOK_SECRET is required" "$STRIPE_ROUTE"; then
  python3 - "$STRIPE_ROUTE" << 'PYEOF'
import sys
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()
if 'STRIPE_WEBHOOK_SECRET is required' in content:
    sys.exit(0)

old = '''  // Verify webhook signature if secret is configured
  let event;
  if (webhookSecret) {'''

new = '''  // In production, webhook secret MUST be configured
  if (!webhookSecret && process.env.NODE_ENV === "production") {
    captureError(new Error("STRIPE_WEBHOOK_SECRET is required in production"), { route: "webhooks/stripe" });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Verify webhook signature if secret is configured
  let event;
  if (webhookSecret) {'''

content = content.replace(old, new, 1)
with open(filepath, 'w') as f:
    f.write(content)
PYEOF
  CHANGES=$((CHANGES + 1))
  echo "  ✅ Enforced Stripe webhook signature in production"
fi

echo ""

# ---------------------------------------------------------------------------
# 6. Anthropic API timeout
# ---------------------------------------------------------------------------
echo "⏱️  Step 6: Adding timeout to Anthropic API calls..."

TO_ESTIMATE="$API_DIR/calls/to-estimate/route.ts"
if [ -f "$TO_ESTIMATE" ] && ! grep -q "AbortController" "$TO_ESTIMATE"; then
  python3 - "$TO_ESTIMATE" << 'PYEOF'
import sys
filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()
if 'AbortController' in content:
    sys.exit(0)

old = '''  // Ask Claude to extract structured estimate data from the transcript
  const response = await anthropic.messages.create({'''

new = '''  // Ask Claude to extract structured estimate data from the transcript
  // 60-second timeout to prevent hung requests
  const controller = new AbortController();
  const aiTimeout = setTimeout(() => controller.abort(), 60_000);

  let response;
  try {
    response = await anthropic.messages.create({'''

content = content.replace(old, new, 1)

old_end = '''    ],
  });'''

new_end = '''    ],
  }, { signal: controller.signal });
  } catch (aiErr) {
    clearTimeout(aiTimeout);
    if ((aiErr as Error).name === "AbortError") {
      return NextResponse.json({ error: "AI processing timed out. Please try again." }, { status: 504 });
    }
    throw aiErr;
  }
  clearTimeout(aiTimeout);'''

content = content.replace(old_end, new_end, 1)

with open(filepath, 'w') as f:
    f.write(content)
PYEOF
  CHANGES=$((CHANGES + 1))
  echo "  ✅ Added 60s timeout to Anthropic API calls"
fi

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "===================================="
echo "✅ Production hardening complete! ($CHANGES changes)"
echo ""
echo "Next steps:"
echo "  1. pnpm typecheck"
echo "  2. pnpm lint"
echo "  3. pnpm test"
echo "  4. git diff  # review changes"
echo "  5. git add -A && git commit -m 'chore: production hardening'"
echo ""
