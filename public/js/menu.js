// menu.js - client side filtering and interactions

document.addEventListener('DOMContentLoaded', async () => {
  // load css for page
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/Menu.css';
  document.head.appendChild(link);

  // debounce function for search
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const products = await fetch('/api/products').then(r => r.json()).catch(()=>[]);
  let allProducts = products || [];
  const productGrid = document.getElementById('productGrid');
  const categoriesEl = document.getElementById('categories');
  const sizesEl = document.getElementById('sizes');
  const noResults = document.getElementById('noResults');

  // build filters
  const categories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
  const aoCategories = document.getElementById('categories-ao');
  const quanCategories = document.getElementById('categories-quan');
  
  categories.forEach(cat => {
    const id = 'cat-' + cat.replace(/\s+/g,'-');
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" name="category" value="${cat}"> ${cat}`;
    if (cat.toLowerCase().includes('áo')) {
      aoCategories.appendChild(lbl);
    } else if (cat.toLowerCase().includes('quần')) {
      quanCategories.appendChild(lbl);
    }
  });

  // Initialize size filter buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
      applyFilters();
    });
  });

  // pagination state
  let currentList = allProducts.slice();
  let currentPage = 1;
  const itemsPerPage = 12; // 4 cards per row * 3 rows

  // render products (with pagination)
  function renderProducts(list, page = 1) {
    currentList = list || [];
    currentPage = page;
    productGrid.innerHTML = '';
    if (!currentList || currentList.length === 0) {
      noResults.style.display = 'block';
      renderPagination(0, 1);
      return;
    }
    noResults.style.display = 'none';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = currentList.slice(start, end);

    pageItems.forEach(p => {
      const col = document.createElement('div');
      col.className = 'col-lg-3 col-md-4 col-sm-6';
      col.innerHTML = `
        <div class="card product-card" data-id="${p._id}">
          ${p.badges && p.badges.length? `<div class="badge-corner">${p.badges[0]}</div>`: ''}
          <div class="product-image-container">
            <img src="${(p.images && p.images[0]) || p.imageUrl || ''}" alt="${p.name}" class="product-main-img">
            <div class="product-overlay">
              <div class="product-actions">
                <div class="add-to-cart-btn">Add to Cart +</div>
                <div class="size-options"></div>
              </div>
            </div>
          </div>
          <div class="card-body">
            <h5 class="product-name">${p.name}</h5>
            <div class="product-price h6 text-danger">${(p.price||0).toLocaleString('vi-VN')}₫</div>
            <div class="variant-list"></div>
          </div>
        </div>
      `;
      productGrid.appendChild(col);

      // variants
      const variantList = col.querySelector('.variant-list');
      (p.images || []).slice(0,4).forEach((imgUrl, idx)=>{
        const im = document.createElement('img');
        im.src = imgUrl;
        im.dataset.src = imgUrl;
        variantList.appendChild(im);
        im.addEventListener('click', (e)=>{
          const main = col.querySelector('.product-main-img');
          main.src = imgUrl;
          variantList.querySelectorAll('img').forEach(i=>i.classList.remove('active'));
          im.classList.add('active');
        });
      });

      // Attach product interactions (sizes / quantity)
      const card = col.querySelector('.product-card');
      setupProductInteractions(card, p);

      // name click -> productDetail route
      const nameEl = col.querySelector('.product-name');
      nameEl.addEventListener('click', ()=>{
        window.location.href = `/product/${p._id}`;
      });
    });

    // render pagination controls
    renderPagination(currentList.length, currentPage);
  }

  function renderPagination(totalItems, page) {
    const pages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    let container = document.getElementById('pagination');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pagination';
      container.className = 'd-flex justify-content-center align-items-center my-4';
      productGrid.parentNode.appendChild(container);
    }
    container.innerHTML = '';

    const createBtn = (text, disabled, onClick) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm btn-outline-secondary mx-1';
      b.textContent = text;
      if (disabled) b.disabled = true;
      b.addEventListener('click', onClick);
      return b;
    };

    // Prev
    container.appendChild(createBtn('<', page <= 1, () => renderProducts(currentList, Math.max(1, page - 1))));

    // page numbers (simple)
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'btn btn-sm mx-1 ' + (i === page ? 'btn-primary' : 'btn-outline-secondary');
      btn.addEventListener('click', () => renderProducts(currentList, i));
      container.appendChild(btn);
    }

    // Next
    container.appendChild(createBtn('>', page >= pages, () => renderProducts(currentList, Math.min(pages, page + 1))));
  }

  function setupProductInteractions(card, product) {
    const overlay = card.querySelector('.product-overlay');
    const addBtn = overlay.querySelector('.add-to-cart-btn');
    const sizeOptions = overlay.querySelector('.size-options');

    // populate available sizes
    sizeOptions.innerHTML = (product.sizes || [])
      .map(sz => `<div class="size-btn" data-size="${sz}">${sz}</div>`)
      .join('');

    let selectedSize = null;
    let isQuantityMode = false;

    // size button clicks
    sizeOptions.addEventListener('click', e => {
      if (e.target.classList.contains('size-btn')) {
        const btn = e.target;
        if (selectedSize !== btn) {
          sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedSize = btn;

          // switch to quantity mode
          isQuantityMode = true;
          addBtn.innerHTML = `<div class="quantity-control">
            <button class="qty-decr">-</button>
            <span class="qty">1</span>
            <button class="qty-incr">+</button>
          </div>`;
        }
      }
    });

    // quantity controls
    overlay.addEventListener('click', e => {
      if (!isQuantityMode) return;

      if (e.target.classList.contains('qty-decr')) {
        const qtyEl = overlay.querySelector('.qty');
        let qty = parseInt(qtyEl.textContent) || 1;
        if (qty > 1) qtyEl.textContent = --qty;
      } else if (e.target.classList.contains('qty-incr')) {
        const qtyEl = overlay.querySelector('.qty');
        let qty = parseInt(qtyEl.textContent) || 1;
        qtyEl.textContent = ++qty;
      }
    });

    // add to cart when mouse leaves quantity control
    const quantityControl = overlay.querySelector('.quantity-control');
    if (quantityControl) {
      quantityControl.addEventListener('mouseleave', () => {
        if (isQuantityMode && selectedSize) {
          const size = selectedSize.dataset.size;
          const qty = parseInt(overlay.querySelector('.qty').textContent) || 1;
          addToCartLocal(product, size, qty);

          // reset state
          setTimeout(() => {
            isQuantityMode = false;
            selectedSize = null;
            addBtn.innerHTML = 'Add to Cart +';
            sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
          }, 1000);
        }
      });
    }
  }

  function hideSizeOverlay(card){
    const overlay = card.querySelector('.size-popup');
    if(overlay) overlay.style.display = 'none';
  }

  // local cart implementation
  function addToCartLocal(product, size, qty){
    const cart = JSON.parse(localStorage.getItem('localCart')||'[]');
    cart.push({ id: product._id, name: product.name, price: product.price, size, qty, image: (product.images && product.images[0])||product.imageUrl });
    localStorage.setItem('localCart', JSON.stringify(cart));
    showAddToast({ name: product.name, size, price: product.price, image: (product.images && product.images[0])||product.imageUrl });
  }

  function showAddToast(item){
    let toast = document.querySelector('.cart-notification');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'cart-notification';
      document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
      <div class="d-flex align-items-start">
        <img class="me-3" src="${item.image}" alt="${item.name}"/>
        <div>
          <div class="fw-bold mb-1">Thêm vào giỏ hàng thành công!</div>
          <div class="small text-muted">${item.name}</div>
          <div class="mt-2">Size: <strong>${item.size}</strong> × ${item.qty}</div>
          <div class="mt-1">Tổng: <span class="text-danger">${((item.price||0) * item.qty).toLocaleString('vi-VN')}₫</span></div>
          <div class="mt-3">
            <button class="btn btn-dark btn-sm" id="viewCartBtn">XEM GIỎ HÀNG →</button>
          </div>
        </div>
        <button class="btn-close ms-3" aria-label="Close"></button>
      </div>
    `;

    toast.querySelector('.btn-close').addEventListener('click', () => {
      toast.classList.remove('show');
    });

    toast.querySelector('#viewCartBtn').addEventListener('click', () => {
      window.location.href = '/view/cart';
    });

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // filtering
  function getActiveFilters(){
    const cats = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(i=>i.value);
    const pris = Array.from(document.querySelectorAll('input[name="price"]:checked')).map(i=>i.value);
    const sizs = Array.from(document.querySelectorAll('.size-btn.active')).map(b=>b.dataset.size);
    return { cats, pris, sizs };
  }

  // Update active filters UI (chips under Collection)
  function updateActiveFiltersUI(){
    const container = document.getElementById('activeFilters');
    if(!container) return;
    container.innerHTML = '';
    const { cats, pris, sizs } = getActiveFilters();

    const makeChip = (label, type, value) => {
      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.dataset.filterType = type;
      chip.dataset.filterValue = value;
      chip.innerHTML = `${label} <button class="chip-close" aria-label="remove">×</button>`;
      // click on chip removes filter
      chip.querySelector('.chip-close').addEventListener('click', (e)=>{
        e.stopPropagation();
        removeFilter(type, value);
      });
      return chip;
    };

    // categories
    cats.forEach(c => {
      container.appendChild(makeChip(c, 'category', c));
    });

    // sizes
    sizs.forEach(s => {
      container.appendChild(makeChip('Size: ' + s, 'size', s));
    });

    // price ranges (format human readable)
    const formatPrice = (r) => {
      const [min,max] = r.split('-').map(Number);
      if (min === 0) return '0 - 200.000đ';
      if (max > 500000) return '> 500.000đ';
      return `${(min).toLocaleString('vi-VN')} - ${(max).toLocaleString('vi-VN')}đ`;
    };

    pris.forEach(p => {
      container.appendChild(makeChip(formatPrice(p), 'price', p));
    });

    // clear all button
    if (cats.length || pris.length || sizs.length) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-sm btn-outline-secondary clear-all';
      clearBtn.textContent = 'Clear All';
      clearBtn.addEventListener('click', ()=>{
        // clear all filters
        document.querySelectorAll('#categories-ao input, #categories-quan input, input[name="price"]').forEach(i=> i.checked=false);
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('active'));
        renderProducts(allProducts, 1);
        updateActiveFiltersUI();
      });
      container.appendChild(clearBtn);
    }
  }

  function removeFilter(type, value){
    if(type === 'category'){
      const el = document.querySelector(`input[name="category"][value="${CSS.escape(value)}"]`);
      if(el) el.checked = false;
    } else if(type === 'size'){
      // size buttons in filter panel have data-size
      const btn = Array.from(document.querySelectorAll('.size-btn')).find(b => b.dataset.size === value || b.textContent.trim() === value);
      if(btn) btn.classList.remove('active');
    } else if(type === 'price'){
      const el = Array.from(document.querySelectorAll('input[name="price"]')).find(i=> i.value === value);
      if(el) el.checked = false;
    }
    applyFilters();
  }

  function applyFilters(){
    const { cats, pris, sizs } = getActiveFilters();
    let list = allProducts.slice();
    if(cats.length) list = list.filter(p=> cats.includes(p.category));
    if(pris.length){
      list = list.filter(p => {
        return pris.some(range=>{
          const [min,max]=range.split('-').map(Number);
          return p.price>=min && p.price<=max;
        });
      });
    }
    if(sizs.length){
      list = list.filter(p => (p.sizes || []).some(s=> sizs.includes(s)));
    }
    renderProducts(list, 1);
    updateActiveFiltersUI();
  }

  // attach filter events
  document.querySelectorAll('input[name="category"]').forEach(i=> i.addEventListener('change', applyFilters));
  document.querySelectorAll('input[name="price"]').forEach(i=> i.addEventListener('change', applyFilters));

  // Clear action moved to the Clear All chip under Collection (handled in updateActiveFiltersUI)

  // search functionality (Menu page had its own search removed; guard for missing element)
  const searchInput = document.getElementById('searchInput');
  const performSearchFilter = (searchTerm) => {
    const { cats, pris, sizs } = getActiveFilters();
    let filtered = allProducts;

    // Apply search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    // Apply other filters
    if(cats.length) filtered = filtered.filter(p => cats.includes(p.category));
    if(pris.length) {
      filtered = filtered.filter(p => {
        return pris.some(range => {
          const [min,max] = range.split('-').map(Number);
          return p.price >= min && p.price <= max;
        });
      });
    }
    if(sizs.length) {
      filtered = filtered.filter(p => (p.sizes || []).some(s => sizs.includes(s)));
    }

    renderProducts(filtered, 1);
  };

  const handleSearch = debounce(() => {
    if (!searchInput) return;
    const searchTerm = searchInput.value.toLowerCase().trim();
    performSearchFilter(searchTerm);
  }, 300);

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  } else {
    // If navbar search redirected here with ?search=..., apply it
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
      performSearchFilter(searchQuery);
      // reflect query in chips
      setTimeout(updateActiveFiltersUI, 50);
    }
  }

  // sorting functionality
  document.querySelectorAll('.dropdown-item[data-sort]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sortType = e.target.dataset.sort;
      let sortedProducts = [...allProducts];

      switch(sortType) {
        case 'price-asc':
          sortedProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          sortedProducts.sort((a, b) => b.price - a.price);
          break;
        case 'name-asc':
          sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
          break;
      }

  renderProducts(sortedProducts, 1);
  updateActiveFiltersUI();
      
      // Update button text
      const dropdownBtn = document.getElementById('sortDropdown');
      dropdownBtn.textContent = e.target.textContent;
    });
  });

  // initial render
  renderProducts(allProducts);
  // initial active filters UI
  updateActiveFiltersUI();

});
