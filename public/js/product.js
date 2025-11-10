document.addEventListener('DOMContentLoaded', () => {
  const mainImg = document.getElementById('mainProductImg');
  const thumbs = document.querySelectorAll('.thumb');
  const sizeButtons = document.querySelectorAll('.size-select');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const buyNowBtn = document.getElementById('buyNowBtn');
  const stockNotice = document.getElementById('stockNotice');

  // thumbnail swap
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      mainImg.src = t.src;
    });
  });

  // size selection
  let selectedSize = null;
  sizeButtons.forEach(b => {
    b.addEventListener('click', () => {
      sizeButtons.forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedSize = b.dataset.size;
    });
  });

  function addToLocalCart(productId, size, qty=1) {
    try {
      // Get product info from the page
      const productName = document.querySelector('.product-title')?.textContent || 'Sản phẩm';
      const priceText = document.querySelector('.product-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
      const productImage = document.getElementById('mainProductImg')?.src || '';

      const cart = JSON.parse(localStorage.getItem('localCart')||'[]');
      const entry = { 
        id: productId, 
        name: productName,
        price: price,
        size, 
        qty,
        image: productImage
      };
      cart.push(entry);
      localStorage.setItem('localCart', JSON.stringify(cart));
      
      // Show improved notification
      showAddToast({
        name: productName,
        size: size,
        qty: qty,
        price: price,
        image: productImage
      });
    } catch (e) {
      console.error('Cart error', e);
    }
  }

  function showAddToast(item) {
    let toast = document.querySelector('.cart-notification');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'cart-notification';
      toast.style.position = 'fixed';
      toast.style.top = '80px';
      toast.style.right = '20px';
      toast.style.zIndex = 2000;
      toast.style.background = 'white';
      toast.style.padding = '20px';
      toast.style.borderRadius = '12px';
      toast.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
      toast.style.maxWidth = '350px';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
      <div class="d-flex align-items-start">
        <img class="me-3" src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"/>
        <div style="flex: 1;">
          <div class="fw-bold mb-1" style="color: #28a745;">✓ Thêm vào giỏ hàng thành công!</div>
          <div class="small text-muted">${item.name}</div>
          <div class="mt-2">Size: <strong>${item.size}</strong> × ${item.qty}</div>
          <div class="mt-1">Tổng: <span class="text-danger fw-bold">${(item.price * item.qty).toLocaleString('vi-VN')}₫</span></div>
          <div class="mt-3">
            <button class="btn btn-dark btn-sm" id="viewCartBtn">XEM GIỎ HÀNG →</button>
          </div>
        </div>
        <button class="btn-close ms-2" aria-label="Close" style="font-size: 0.8rem;"></button>
      </div>
    `;

    toast.querySelector('.btn-close').addEventListener('click', () => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    });

    toast.querySelector('#viewCartBtn').addEventListener('click', () => {
      window.location.href = '/view/cart';
    });

    // Show toast with animation
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Auto hide after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // attach add to cart
  addToCartBtn.addEventListener('click', () => {
    const productId = document.querySelector('.product-card') ? document.querySelector('.product-card').dataset.id : null;
    const productElem = document.querySelector('.product-page');
    // try to get id from page's product data stored as data attribute on main container
    // fallback: parse from URL
    let id = null;
    if (!id) {
      // Match both /product/ and /menu/ routes
      const m = window.location.pathname.match(/\/(product|menu)\/(.+)$/);
      if (m) id = m[2];
    }

    if (!selectedSize) {
      stockNotice.textContent = 'Vui lòng chọn kích thước';
      stockNotice.style.color = '#d63333';
      return;
    }

    addToLocalCart(id, selectedSize, 1);
  });

  buyNowBtn.addEventListener('click', () => {
    // minimal behaviour: add to cart then go to cart page
    // Match both /product/ and /menu/ routes
    const m = window.location.pathname.match(/\/(product|menu)\/(.+)$/);
    const id = m ? m[2] : null;
    if (!selectedSize) {
      stockNotice.textContent = 'Vui lòng chọn kích thước';
      stockNotice.style.color = '#d63333';
      return;
    }
    addToLocalCart(id, selectedSize, 1);
    window.location.href = '/view/cart';
  });
});
