// public/js/admin-user-detail.js
(async () => {
  const token = (function(){ const c=document.cookie.split('; ').find(r=>r.startsWith('token=')); return c?c.split('=')[1]:localStorage.getItem('token'); })();
  const card = document.getElementById('userCard');

  async function load() {
    const res = await fetch(`/api/admin/users/${userId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' }});
    if (!res.ok) return card.innerHTML = `<div class="alert alert-danger">Unable to load user</div>`;
    const j = await res.json();
    const u = j.data;
    card.innerHTML = `
      <div class="card p-3">
        <h4>${u.name||'-'} ${u.banned ? '<span class="badge bg-danger">BANNED</span>' : ''}</h4>
        <p><strong>Email:</strong> ${u.email||'-'}</p>
        <p><strong>Role:</strong> ${u.role||'-'}</p>
        <p><strong>Created:</strong> ${new Date(u.createdAt).toLocaleString()}</p>
        <hr>
        <h6>Orders</h6>
        <p>Orders count: ${u.stats?.ordersCount||0}</p>
        <p>Total spent: ${(u.stats?.totalSpent||0).toLocaleString('vi-VN')}₫</p>
      </div>
    `;
  }

  load();
})();
