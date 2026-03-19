/**
 * Material cart link builder.
 * Matches estimate line items to products with HD/Lowe's SKUs
 * and builds deep-link cart URLs.
 *
 * No external dependencies.
 */

export interface CartLineItem { description: string; quantity: number; productId?: string; skuHd?: string | null; skuLowes?: string | null; unitPrice?: number; }
export interface CartResult { homeDepot: { url: string | null; itemCount: number; items: Array<{ description: string; sku: string; quantity: number }> }; lowes: { url: string | null; itemCount: number; items: Array<{ description: string; sku: string; quantity: number }> }; unmatchedItems: Array<{ description: string; quantity: number }>; matchRate: number; }

export function buildHomeDepotCartUrl(items: Array<{ sku: string; quantity: number }>): string {
  const itemList = items.map((i) => `${encodeURIComponent(i.sku)},${i.quantity}`).join(',');
  return `https://www.homedepot.com/mycart/home?itemList=${itemList}`;
}

export function buildLowesCartUrl(items: Array<{ sku: string; quantity: number }>): string {
  const itemList = items.map((i) => `${encodeURIComponent(i.sku)}|${i.quantity}`).join(',');
  return `https://www.lowes.com/cart?items=${itemList}`;
}

export function buildCartLinks(lineItems: CartLineItem[]): CartResult {
  const hdItems: Array<{ description: string; sku: string; quantity: number }> = [];
  const lowesItems: Array<{ description: string; sku: string; quantity: number }> = [];
  const unmatchedItems: Array<{ description: string; quantity: number }> = [];
  let matchedCount = 0;
  for (const item of lineItems) {
    const qty = Math.ceil(item.quantity);
    const hasHd = item.skuHd != null && item.skuHd !== '';
    const hasLowes = item.skuLowes != null && item.skuLowes !== '';
    if (hasHd) hdItems.push({ description: item.description, sku: item.skuHd!, quantity: qty });
    if (hasLowes) lowesItems.push({ description: item.description, sku: item.skuLowes!, quantity: qty });
    if (hasHd || hasLowes) matchedCount++; else unmatchedItems.push({ description: item.description, quantity: item.quantity });
  }
  const matchRate = lineItems.length > 0 ? matchedCount / lineItems.length : 0;
  return { homeDepot: { url: hdItems.length > 0 ? buildHomeDepotCartUrl(hdItems) : null, itemCount: hdItems.length, items: hdItems }, lowes: { url: lowesItems.length > 0 ? buildLowesCartUrl(lowesItems) : null, itemCount: lowesItems.length, items: lowesItems }, unmatchedItems, matchRate };
}
