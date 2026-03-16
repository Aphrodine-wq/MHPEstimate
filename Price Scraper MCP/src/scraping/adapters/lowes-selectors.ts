export const LowesSelectors = {
  // Search page
  searchGrid: '[data-selector="splp-prd-lst"]',
  searchCard: '[data-selector="prd-lst-itm"]',
  searchCardName: '[data-selector="splp-prd-tlt"]',
  searchCardPrice: '[data-selector="splp-prc"]',
  searchCardImage: '[data-selector="splp-prd-img"] img',
  searchCardLink: 'a[data-selector="splp-prd-tlt"]',

  // Product page
  productName: 'h1[data-selector="pdp-prd-tlt"]',
  productPrice: '[data-selector="pdp-prc"]',
  productBrand: '[data-selector="pdp-prd-brnd"]',
  productImage: '[data-selector="pdp-img-main"] img',
  productModel: '[data-selector="pdp-prd-mdl"]',
  productDescription: '[data-selector="pdp-prd-desc"]',
  productBulkPrice: '[data-selector="pdp-bulk-prc"]',
  promoFlag: '[data-selector="pdp-badge-sale"]',
  promoExpiry: '[data-selector="pdp-promo-exp"]',

  // Store/ZIP selector
  storeSelector: '[data-selector="hdr-str-slctr"]',
  storeSelectorInput: 'input[data-selector="str-fndr-inpt"]',
  storeSelectorSubmit: 'button[data-selector="str-fndr-sbmt"]',
  storeSelectorResult: '[data-selector="str-fndr-rslt"]',

  // Category nav
  categoryNav: '[data-selector="nav-cat"]',
  categoryLink: '[data-selector="nav-cat-lnk"]',

  // Inventory
  inventoryStatus: '[data-selector="pdp-inv-sts"]',
  inventoryQuantity: '[data-selector="pdp-inv-qty"]',
  inventoryAisle: '[data-selector="pdp-inv-aisle"]',
};
