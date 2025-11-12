// public/js/admin-stats.js
(async () => {
  const token = (function(){ const c=document.cookie.split('; ').find(r=>r.startsWith('token=')); return c?c.split('=')[1]:localStorage.getItem('token'); })();
  const res = await fetch('/api/admin/statistics', {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });
  if (!res.ok) {
    document.getElementById('cards').innerHTML = '<div class="alert alert-danger">Cannot load stats</div>';
    return;
  }
  const j = await res.json();
  const d = j.data;

  // cards
  const cards = document.getElementById('cards');
  cards.innerHTML = `
    <div class="card p-3"><div>Total Sales</div><h4>${(d.totalSales||0).toLocaleString('vi-VN')}₫</h4></div>
    <div class="card p-3"><div>Orders</div><h4>${d.ordersCount||0}</h4></div>
    <div class="card p-3"><div>Customers</div><h4>${d.customersCount||0}</h4></div>
  `;

  // sales chart
  const labels = d.salesByDay.map(s => s._id);
  const data = d.salesByDay.map(s => s.total || 0);
  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Sales (₫)', data }] }
  });

  // top products
  const tp = document.getElementById('topProducts');
  tp.innerHTML = '';
  (d.topProducts||[]).forEach(p => {
    const col = document.createElement('div');
    col.className = 'col-md-3';
    col.innerHTML = `
      <div class="card p-2 mb-3">
        <div><strong>ID:</strong> ${p._id}</div>
        <div><strong>Qty:</strong> ${p.qtySold}</div>
        <div><strong>Revenue:</strong> ${(p.revenue||0).toLocaleString('vi-VN')}₫</div>
      </div>
    `;
    tp.appendChild(col);
  });
})();
