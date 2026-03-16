#!/bin/bash
# ============================================================
# MHP Estimate — Apply All Production Patches
# Run from the project root: bash patches/apply-all.sh
# ============================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Applying all patches from: $SCRIPT_DIR"
echo "📁 Project root: $ROOT_DIR"
echo ""

# ── 1. Sentry Integration (19 API routes) ──────────────────
echo "━━━ 1/3: Sentry Error Tracking ━━━"
SENTRY_SRC="$SCRIPT_DIR/sentry-integration"
API_DST="$ROOT_DIR/apps/web/src/app/api"

if [ -d "$SENTRY_SRC" ]; then
  cp -r "$SENTRY_SRC"/* "$API_DST/"
  echo "  ✅ Copied Sentry-enhanced API routes (19 files)"
else
  echo "  ⚠️  Sentry patch files not found at $SENTRY_SRC"
fi

# ── 2. Portal Enhancements ─────────────────────────────────
echo ""
echo "━━━ 2/3: Portal Enhancements ━━━"
PORTAL_SRC="$SCRIPT_DIR/portal-enhanced-page.tsx"
PORTAL_DST="$ROOT_DIR/apps/web/src/app/portal/[id]/page.tsx"

if [ -f "$PORTAL_SRC" ]; then
  cp "$PORTAL_SRC" "$PORTAL_DST"
  echo "  ✅ Applied portal enhancements (viewed tracking, print, mobile responsive, CO approval)"
else
  echo "  ⚠️  Portal patch file not found at $PORTAL_SRC"
fi

# ── 3. Verify ──────────────────────────────────────────────
echo ""
echo "━━━ 3/3: Verification ━━━"
MISSING=0

# Check a sample of sentry routes
for route in "audit-log/route.ts" "calls/to-estimate/route.ts" "estimates/[id]/send/route.ts" "webhooks/stripe/route.ts"; do
  if grep -q "captureError" "$API_DST/$route" 2>/dev/null; then
    echo "  ✅ $route — Sentry integrated"
  else
    echo "  ❌ $route — Sentry missing"
    MISSING=$((MISSING + 1))
  fi
done

# Check portal
if grep -q "portal-viewed" "$PORTAL_DST" 2>/dev/null; then
  echo "  ✅ Portal page — Viewed tracking present"
else
  echo "  ❌ Portal page — Viewed tracking missing"
  MISSING=$((MISSING + 1))
fi

echo ""
if [ $MISSING -eq 0 ]; then
  echo "🎉 All patches applied successfully!"
else
  echo "⚠️  $MISSING patches may need manual review"
fi

echo ""
echo "Next steps:"
echo "  1. Run: pnpm typecheck"
echo "  2. Run: pnpm lint"
echo "  3. Run: pnpm test"
echo "  4. Review changes: git diff"
echo "  5. Commit: git add -A && git commit -m 'chore: apply production patches'"
