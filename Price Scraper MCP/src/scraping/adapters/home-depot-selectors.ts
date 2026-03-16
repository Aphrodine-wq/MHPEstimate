export const HomeDepotSelectors = {
  // Search page
  searchGrid: '.browse-search__pod',
  searchCard: '.browse-search__pod .plp-pod',
  searchCardName: '.product-header__title',
  searchCardPrice: '.price-format__main-price',
  searchCardImage: '.stretcher img',
  searchCardLink: 'a[data-testid="product-header"]',
  searchCardSku: '[data-sku]',

  // Product page
  productName: 'h1.product-details__title',
  productPrice: '.price-format__main-price',
  productBrand: '.product-details__brand--link',
  productImage: '.mediagallery__mainimage img',
  productSku: '[data-sku]',
  productDescription: '.product-details__description',
  productBulkPrice: '.price-format__bulk-price',
  promoFlag: '.product-details__badge--sale',
  promoExpiry: '.product-details__promo-expiry',

  // Store/ZIP selector
  storeSelector: '#myStore',
  storeSelectorInput: 'input[data-testid="store-finder-input"]',
  storeSelectorSubmit: 'button[data-testid="store-finder-submit"]',
  storeSelectorResult: '.store-pod__name',

  // Category nav
  categoryNav: '.desktop-nav__category',
  categoryLink: '.desktop-nav__category-link',

  // Inventory
  inventoryStatus: '.store-inventory__status',
  inventoryQuantity: '.store-inventory__quantity',
  inventoryAisle: '.store-inventory__aisle',
};
