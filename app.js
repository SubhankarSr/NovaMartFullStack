const state = {
  allProducts:    [],  
  filtered:       [],  
  cart:           [],   
  activeCategory: 'all',
  maxPrice:       2000,
  minRating:      0,
  sortBy:         'featured',
  searchQuery:    '',
};

const dom = {

  productGrid:    document.getElementById('productGrid'),
  loadingGrid:    document.getElementById('loadingGrid'),
  noResults:      document.getElementById('noResults'),
  resultCount:    document.getElementById('resultCount'),

  
  categoryFilter: document.getElementById('categoryFilter'),
  priceRange:     document.getElementById('priceRange'),
  priceValue:     document.getElementById('priceValue'),
  ratingFilters:  document.getElementById('ratingFilters'),
  sortSelect:     document.getElementById('sortSelect'),
  resetFilters:   document.getElementById('resetFilters'),
  resetFilters2:  document.getElementById('resetFilters2'),
  searchInput:    document.getElementById('searchInput'),

  
  filterSidebar:  document.getElementById('filterSidebar'),
  filterToggle:   document.getElementById('filterToggle'),
  closeSidebar:   document.getElementById('closeSidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),

 
  cartSidebar:    document.getElementById('cartSidebar'),
  cartOverlay:    document.getElementById('cartOverlay'),
  cartToggle:     document.getElementById('cartToggle'),
  closeCart:      document.getElementById('closeCart'),
  cartBody:       document.getElementById('cartBody'),
  cartEmpty:      document.getElementById('cartEmpty'),
  cartFooter:     document.getElementById('cartFooter'),
  cartBadge:      document.getElementById('cartBadge'),
  cartItemCount:  document.getElementById('cartItemCount'),
  cartTotal:      document.getElementById('cartTotal'),

 
  themeToggle:    document.getElementById('themeToggle'),
  themeIcon:      document.getElementById('themeIcon'),

  
  toast:          document.getElementById('toast'),
};

/* ----------------------------------------------------------
   3. THEME  (dark / light)
   ---------------------------------------------------------- */

/**
 * Apply a theme to <html> and save in localStorage.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('novamart_theme', theme);
}

/** Toggle between light and dark mode */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/** Load saved theme on startup */
function loadTheme() {
  const saved = localStorage.getItem('novamart_theme') || 'light';
  applyTheme(saved);
}

/* ----------------------------------------------------------
   4. API + DATA FETCHING
   ---------------------------------------------------------- */

const API_URL = 'https://dummyjson.com/products?limit=100';

/** Fetch all products from the DummyJSON API */
async function fetchProducts() {
  showSkeletons(8);  // show loading skeletons

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const data = await res.json();
    state.allProducts = data.products;

    // Populate category dropdown
    buildCategoryOptions(state.allProducts);

    // Set max price ceiling from real data
    const maxFromData = Math.ceil(
      Math.max(...state.allProducts.map(p => p.price))
    );
    state.maxPrice = maxFromData;
    dom.priceRange.max   = maxFromData;
    dom.priceRange.value = maxFromData;
    dom.priceValue.textContent = `$${maxFromData}`;

    // Initial render
    applyFiltersAndSort();

  } catch (err) {
    console.error('Failed to fetch products:', err);
    dom.loadingGrid.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:var(--clr-sale);padding:40px 0;">
        ⚠ Could not load products. Check your connection and refresh.
      </p>`;
  }
}

/* ----------------------------------------------------------
   5. SKELETON LOADERS
   ---------------------------------------------------------- */

/**
 * Show n skeleton cards in the loading grid.
 * @param {number} n
 */
function showSkeletons(n) {
  dom.loadingGrid.innerHTML = '';
  dom.loadingGrid.style.display = 'grid';

  for (let i = 0; i < n; i++) {
    dom.loadingGrid.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line btn"></div>
        </div>
      </div>`;
  }
}

/** Hide the skeleton grid */
function hideSkeletons() {
  dom.loadingGrid.style.display = 'none';
  dom.loadingGrid.innerHTML = '';
}

/* ----------------------------------------------------------
   6. RENDERING PRODUCTS
   ---------------------------------------------------------- */

/**
 * Build the HTML for a single product card.
 * @param {Object} product
 * @returns {string} HTML string
 */
function createCardHTML(product) {
  // Discount badge — show if discountPercentage > 5
  const hasSale   = product.discountPercentage > 5;
  const saleBadge = hasSale
    ? `<span class="sale-badge">-${Math.round(product.discountPercentage)}%</span>`
    : '';

  // Original price (before discount)
  const originalPrice = hasSale
    ? `<span class="card-original-price">$${(product.price / (1 - product.discountPercentage / 100)).toFixed(2)}</span>`
    : '';

  // Star rendering (filled ★ / empty ☆)
  const stars = renderStars(product.rating);

  return `
    <article class="product-card" data-id="${product.id}">
      ${saleBadge}
      <div class="card-img-wrap">
        <img
          src="${product.thumbnail}"
          alt="${escapeHTML(product.title)}"
          loading="lazy"
        />
      </div>
      <div class="card-body">
        <span class="card-category">${escapeHTML(product.category)}</span>
        <h3 class="card-name">${escapeHTML(product.title)}</h3>
        <div class="card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-num">${product.rating.toFixed(1)}</span>
        </div>
        <div class="card-price-row">
          <span class="card-price">$${product.price.toFixed(2)}</span>
          ${originalPrice}
        </div>
        <button
          class="add-cart-btn"
          data-id="${product.id}"
          aria-label="Add ${escapeHTML(product.title)} to cart"
        >
          🛒 Add to Cart
        </button>
      </div>
    </article>`;
}

/**
 * Convert a rating number to a ★/☆ string.
 * @param {number} rating  0–5
 * @returns {string}
 */
function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= Math.round(rating) ? '★' : '☆';
  }
  return stars;
}

/** Render the current filtered list into the product grid */
function renderProducts() {
  hideSkeletons();

  const products = state.filtered;

  if (products.length === 0) {
    dom.productGrid.innerHTML = '';
    dom.noResults.classList.remove('hidden');
    dom.resultCount.innerHTML = 'No products found';
    return;
  }

  dom.noResults.classList.add('hidden');
  dom.resultCount.innerHTML = `Showing <strong>${products.length}</strong> product${products.length !== 1 ? 's' : ''}`;

  dom.productGrid.innerHTML = products.map(createCardHTML).join('');
}

/* ----------------------------------------------------------
   7. FILTERING & SORTING
   ---------------------------------------------------------- */

/** Build <option> elements for each unique category */
function buildCategoryOptions(products) {
  const categories = [...new Set(products.map(p => p.category))].sort();

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = capitalise(cat);
    dom.categoryFilter.appendChild(opt);
  });
}

/** Apply all current filters then sort, and re-render */
function applyFiltersAndSort() {
  let result = [...state.allProducts];

  // 1. Search query
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // 2. Category
  if (state.activeCategory !== 'all') {
    result = result.filter(p => p.category === state.activeCategory);
  }

  // 3. Max price
  result = result.filter(p => p.price <= state.maxPrice);

  // 4. Min rating
  if (state.minRating > 0) {
    result = result.filter(p => p.rating >= state.minRating);
  }

  // 5. Sort
  result = sortProducts(result, state.sortBy);

  state.filtered = result;
  renderProducts();
}

/**
 * Sort an array of products.
 * @param {Array}  products
 * @param {string} method
 * @returns {Array}
 */
function sortProducts(products, method) {
  const arr = [...products];
  switch (method) {
    case 'price-asc':   return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':  return arr.sort((a, b) => b.price - a.price);
    case 'rating-desc': return arr.sort((a, b) => b.rating - a.rating);
    case 'name-asc':    return arr.sort((a, b) => a.title.localeCompare(b.title));
    default:            return arr; // 'featured' — keep API order
  }
}

/** Reset all filters to defaults */
function resetFilters() {
  state.activeCategory = 'all';
  state.maxPrice       = parseInt(dom.priceRange.max);
  state.minRating      = 0;
  state.searchQuery    = '';
  state.sortBy         = 'featured';

  dom.categoryFilter.value  = 'all';
  dom.priceRange.value      = dom.priceRange.max;
  dom.priceValue.textContent = `$${dom.priceRange.max}`;
  dom.sortSelect.value      = 'featured';
  dom.searchInput.value     = '';

  // Reset rating buttons
  dom.ratingFilters.querySelectorAll('.rating-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rating === '0');
  });

  applyFiltersAndSort();
}

/* ----------------------------------------------------------
   8. CART LOGIC
   ---------------------------------------------------------- */

/** Load cart from localStorage */
function loadCart() {
  const saved = localStorage.getItem('novamart_cart');
  if (saved) {
    try {
      state.cart = JSON.parse(saved);
    } catch (e) {
      state.cart = [];
    }
  }
}

/** Save cart to localStorage */
function saveCart() {
  localStorage.setItem('novamart_cart', JSON.stringify(state.cart));
}

/**
 * Add a product to the cart (or increment qty).
 * @param {number} productId
 */
function addToCart(productId) {
  const product = state.allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(item => item.product.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ product, qty: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`✓ ${product.title.slice(0, 30)}… added to cart`);
  animateCartBadge();
}

/**
 * Change the quantity of a cart item.
 * Removes it if qty reaches 0.
 * @param {number} productId
 * @param {number} delta  +1 or -1
 */
function changeQty(productId, delta) {
  const idx = state.cart.findIndex(item => item.product.id === productId);
  if (idx === -1) return;

  state.cart[idx].qty += delta;

  if (state.cart[idx].qty <= 0) {
    state.cart.splice(idx, 1);  // remove from cart
  }

  saveCart();
  updateCartUI();
}

/** Animate the cart badge on add */
function animateCartBadge() {
  dom.cartBadge.classList.remove('bump');
  // Force reflow to restart animation
  void dom.cartBadge.offsetWidth;
  dom.cartBadge.classList.add('bump');
}

/* ----------------------------------------------------------
   9. CART UI
   ---------------------------------------------------------- */

/** Rebuild the cart sidebar and update badge / total */
function updateCartUI() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  // Header badge
  dom.cartBadge.textContent = totalItems;
  dom.cartItemCount.textContent = `(${totalItems})`;

  // Total
  dom.cartTotal.textContent = `$${totalPrice.toFixed(2)}`;

  // Empty / non-empty states
  if (state.cart.length === 0) {
    dom.cartBody.classList.add('hidden');
    dom.cartEmpty.classList.remove('hidden');
    dom.cartFooter.style.opacity = '0.4';
    dom.cartFooter.style.pointerEvents = 'none';
  } else {
    dom.cartBody.classList.remove('hidden');
    dom.cartEmpty.classList.add('hidden');
    dom.cartFooter.style.opacity = '1';
    dom.cartFooter.style.pointerEvents = 'auto';
  }

  // Render cart items
  dom.cartBody.innerHTML = state.cart.map(item => `
    <div class="cart-item" data-id="${item.product.id}">
      <img
        class="cart-item-img"
        src="${item.product.thumbnail}"
        alt="${escapeHTML(item.product.title)}"
        loading="lazy"
      />
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHTML(item.product.title)}</p>
        <p class="cart-item-price">$${item.product.price.toFixed(2)}</p>
        <div class="qty-controls">
          <button class="qty-btn" data-action="dec" data-id="${item.product.id}" aria-label="Decrease quantity">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.product.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <span class="cart-item-subtotal">$${(item.product.price * item.qty).toFixed(2)}</span>
    </div>
  `).join('');
}

/** Open cart sidebar */
function openCart() {
  dom.cartSidebar.classList.add('open');
  dom.cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/** Close cart sidebar */
function closeCart() {
  dom.cartSidebar.classList.remove('open');
  dom.cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ----------------------------------------------------------
   10. TOAST NOTIFICATIONS
   ---------------------------------------------------------- */

let toastTimer;

/**
 * Show a temporary toast message.
 * @param {string} message
 * @param {number} duration  ms (default 2500)
 */
function showToast(message, duration = 2500) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('show');
  }, duration);
}

/* ----------------------------------------------------------
   11. UTILITY HELPERS
   ---------------------------------------------------------- */

/**
 * Capitalise first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ----------------------------------------------------------
   12. EVENT LISTENERS
   ---------------------------------------------------------- */

function attachEventListeners() {

  /* ---- Theme toggle ---- */
  dom.themeToggle.addEventListener('click', toggleTheme);

  /* ---- Search (debounced) ---- */
  let searchDebounce;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = dom.searchInput.value.trim();
      applyFiltersAndSort();
    }, 300);
  });

  /* ---- Category filter ---- */
  dom.categoryFilter.addEventListener('change', () => {
    state.activeCategory = dom.categoryFilter.value;
    applyFiltersAndSort();
  });

  /* ---- Price range ---- */
  dom.priceRange.addEventListener('input', () => {
    state.maxPrice = parseInt(dom.priceRange.value);
    dom.priceValue.textContent = `$${state.maxPrice}`;
    applyFiltersAndSort();
  });

  /* ---- Rating filters ---- */
  dom.ratingFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.rating-btn');
    if (!btn) return;

    // Update active style
    dom.ratingFilters.querySelectorAll('.rating-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.minRating = parseFloat(btn.dataset.rating);
    applyFiltersAndSort();
  });

  /* ---- Sort ---- */
  dom.sortSelect.addEventListener('change', () => {
    state.sortBy = dom.sortSelect.value;
    applyFiltersAndSort();
  });

  /* ---- Reset filters ---- */
  dom.resetFilters.addEventListener('click', resetFilters);
  dom.resetFilters2.addEventListener('click', resetFilters);

  /* ---- Add to cart (event delegation on grid) ---- */
  dom.productGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-cart-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    addToCart(id);
  });

  /* ---- Cart sidebar open / close ---- */
  dom.cartToggle.addEventListener('click', openCart);
  dom.closeCart.addEventListener('click', closeCart);
  dom.cartOverlay.addEventListener('click', closeCart);

  /* ---- Cart qty controls (event delegation) ---- */
  dom.cartBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const id    = parseInt(btn.dataset.id);
    const delta = btn.dataset.action === 'inc' ? 1 : -1;
    changeQty(id, delta);
  });

  /* ---- Checkout (demo only) ---- */
  document.querySelector('.checkout-btn').addEventListener('click', () => {
    if (state.cart.length === 0) return;
    showToast('🎉 Order placed! (demo mode)', 3000);
    state.cart = [];
    saveCart();
    updateCartUI();
    closeCart();
  });

  /* ---- Mobile filter sidebar ---- */
  dom.filterToggle.addEventListener('click', () => {
    dom.filterSidebar.classList.add('open');
    dom.sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  dom.closeSidebar.addEventListener('click', closeFilterSidebar);
  dom.sidebarOverlay.addEventListener('click', closeFilterSidebar);

  /* ---- Keyboard: close sidebars on Escape ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeFilterSidebar();
    }
  });
}

/** Close the mobile filter sidebar */
function closeFilterSidebar() {
  dom.filterSidebar.classList.remove('open');
  dom.sidebarOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ----------------------------------------------------------
   13. INITIALISATION
   ---------------------------------------------------------- */

function init() {
  loadTheme();    // restore saved theme
  loadCart();     // restore saved cart
  updateCartUI(); // reflect restored cart in header badge
  attachEventListeners();
  fetchProducts(); // kick off API call
}


document.addEventListener('DOMContentLoaded', init);