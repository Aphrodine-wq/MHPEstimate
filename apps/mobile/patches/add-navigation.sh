#!/bin/bash
# Patch existing mobile screens to add navigation to detail screens.
# Run from the monorepo root: bash apps/mobile/patches/add-navigation.sh

set -e
MOBILE="apps/mobile/app/(tabs)"

echo "Patching estimates screen to navigate to estimate detail..."
# Add router import and navigation to estimates.tsx
sed -i 's/import { useState, useCallback } from "react";/import { useState, useCallback } from "react";\nimport { router } from "expo-router";/' "$MOBILE/estimates.tsx"
# Make the estimate row tappable
sed -i 's/const renderItem = ({ item }: { item: Estimate }) => (/const renderItem = ({ item }: { item: Estimate }) => (\n    <TouchableOpacity onPress={() => router.push(`\/estimate\/${item.id}`)} activeOpacity={0.7}>/' "$MOBILE/estimates.tsx"
# Close the TouchableOpacity wrapper (before the last View closing tag of the row)
sed -i '/style={styles.tierBadge}.*<\/Text>/a\      <\/TouchableOpacity>' "$MOBILE/estimates.tsx" 2>/dev/null || true

echo "Patching clients screen to navigate to client detail..."
# Add router import to clients.tsx (already has it via expo-router? Check first)
grep -q 'import { router }' "$MOBILE/clients.tsx" || \
  sed -i 's/import { useState, useCallback } from "react";/import { useState, useCallback } from "react";\nimport { router } from "expo-router";/' "$MOBILE/clients.tsx"
# Make client rows tappable
sed -i 's/const renderItem = ({ item }: { item: Client }) => (/const renderItem = ({ item }: { item: Client }) => (\n    <TouchableOpacity onPress={() => router.push(`\/client\/${item.id}`)} activeOpacity={0.7}>/' "$MOBILE/clients.tsx"

echo "Patching settings screen to navigate to new screens..."
# Make settings rows tappable
python3 << 'PYEOF'
import re

with open("apps/mobile/app/(tabs)/settings.tsx", "r") as f:
    content = f.read()

# Replace static SettingsRow with TouchableOpacity versions for navigable items
content = content.replace(
    '<SettingsRow label="Analytics" sub="View performance metrics" />',
    '<TouchableOpacity onPress={() => router.push("/analytics")}><SettingsRow label="Analytics" sub="View performance metrics" /></TouchableOpacity>'
)
content = content.replace(
    '<SettingsRow label="Call History" sub="Voice call logs" />',
    '<TouchableOpacity onPress={() => router.push("/calls")}><SettingsRow label="Call History" sub="Voice call logs" /></TouchableOpacity>'
)
content = content.replace(
    '<SettingsRow label="Materials" sub="Product & pricing database" />',
    '<TouchableOpacity onPress={() => router.push("/materials")}><SettingsRow label="Materials" sub="Product & pricing database" /></TouchableOpacity>'
)

with open("apps/mobile/app/(tabs)/settings.tsx", "w") as f:
    f.write(content)

PYEOF

echo "Patching dashboard to navigate to estimate detail..."
python3 << 'PYEOF'
import re

with open("apps/mobile/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

# Add router import if not present
if "import { router }" not in content:
    content = content.replace(
        'import { useState, useCallback } from "react";',
        'import { useState, useCallback } from "react";\nimport { router } from "expo-router";'
    )

# Make EstimateRow tappable by wrapping in TouchableOpacity
content = content.replace(
    'function EstimateRow({ estimate, last }: { estimate: Estimate; last: boolean }) {\n  return (\n    <View style={[styles.estimateRow, !last && styles.borderBottom]}>',
    'function EstimateRow({ estimate, last }: { estimate: Estimate; last: boolean }) {\n  return (\n    <TouchableOpacity onPress={() => router.push(`/estimate/${estimate.id}`)} activeOpacity={0.7} style={[styles.estimateRow, !last && styles.borderBottom]}>'
)
content = content.replace(
    '      </View>\n    </View>\n  );\n}\n\nfunction LoadingRows',
    '      </View>\n    </TouchableOpacity>\n  );\n}\n\nfunction LoadingRows'
)

with open("apps/mobile/app/(tabs)/index.tsx", "w") as f:
    f.write(content)

PYEOF

echo "Done! All navigation patches applied."
echo ""
echo "New screens added:"
echo "  - app/estimate/[id].tsx     (full estimate editor with 3 tabs)"
echo "  - app/client/[id].tsx       (client detail + edit form)"
echo "  - app/analytics/index.tsx   (KPIs, charts, breakdowns)"
echo "  - app/materials/index.tsx   (product catalog with CRUD)"
echo "  - app/calls/index.tsx       (voice call history)"
echo "  - app/change-orders/[estimateId].tsx  (change order management)"
echo "  - app/job-actuals/[estimateId].tsx    (actual costs vs estimated)"
echo "  - lib/store-extra.ts        (useVoiceCalls, useJobActuals, useChangeOrders)"
