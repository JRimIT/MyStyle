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

      const cart = JSON.parse(localStorage.getItem('localCart')||'[]');
      const entry = { id: productId, size, qty };
      cart.push(entry);
      localStorage.setItem('localCart', JSON.stringify(cart));
      // show notice near cart (simple)
      const toast = document.createElement('div');
      toast.className = 'cart-notification show';

      toast.style.position = 'fixed';
      toast.style.top = '80px';
      toast.style.right = '20px';
      toast.style.zIndex = 2000;

      toast.innerHTML = `<div class="p-3 bg-white shadow rounded">Đã thêm vào giỏ hàng<br>${size} × ${qty}</div>`;
      document.body.appendChild(toast);
      setTimeout(()=>{ toast.remove(); }, 2500);
    } catch (e) {
      console.error('Cart error', e);
    }

  }

  // attach add to cart
  addToCartBtn.addEventListener('click', () => {
    const productId = document.querySelector('.product-card') ? document.querySelector('.product-card').dataset.id : null;
    const productElem = document.querySelector('.product-page');
    // try to get id from page's product data stored as data attribute on main container
    // fallback: parse from URL
    let id = null;
    if (!id) {

      const m = window.location.pathname.match(/\/product\/(.+)$/);
      if (m) id = m[1];

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

    const m = window.location.pathname.match(/\/product\/(.+)$/);
    const id = m ? m[1] : null;

    if (!selectedSize) {
      stockNotice.textContent = 'Vui lòng chọn kích thước';
      stockNotice.style.color = '#d63333';
      return;
    }
    addToLocalCart(id, selectedSize, 1);
    window.location.href = '/view/cart';
  });
});
