// public/js/admin-users.js
(async () => {
  const usersTbody = document.getElementById('usersTbody');
  const qInput = document.getElementById('q');
  const btnSearch = document.getElementById('btnSearch');
  const paginationEl = document.getElementById('pagination');

  // helper toast
  function showToast(html) {
    let t = document.querySelector('.toast-admin');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast-admin';
      document.body.appendChild(t);
    }
    t.innerHTML = `<div class="card p-2">${html}</div>`;
    setTimeout(()=> t.innerHTML = '', 3000);
  }

  const token = (function(){ // get token from cookie or localstorage
    const fromCookie = document.cookie.split('; ').find(r=>r.startsWith('token='));
    if (fromCookie) return fromCookie.split('=')[1];
    return localStorage.getItem('token');
  })();

  async function fetchUsers(page=1, q='') {
    const res = await fetch(`/api/admin/users?page=${page}&limit=20&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    });
    if (!res.ok) {
      showToast('Failed to load users');
      return;
    }
    const json = await res.json();
    renderUsers(json.data, json.meta);
  }

  function renderUsers(users, meta) {
    usersTbody.innerHTML = '';
    users.forEach((u, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${u.role || '-'}</td>
        <td>${new Date(u.createdAt).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-info btn-view" data-id="${u._id}">View</button>
          <button class="btn btn-sm ${u.banned ? 'btn-success' : 'btn-danger'} btn-ban" data-id="${u._id}">${u.banned ? 'Unban' : 'Ban'}</button>
        </td>
      `;
      usersTbody.appendChild(tr);
    });

    // simple pagination controls
    paginationEl.innerHTML = '';
    const pages = Math.ceil((meta?.total || users.length) / meta?.limit || 20);
    for (let i=1;i<=Math.max(1,pages);i++){
      const li = document.createElement('li');
      li.className = 'page-item';
      li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
      paginationEl.appendChild(li);
    }
  }

  // delegation for actions
  document.addEventListener('click', async e => {
    if (e.target.classList.contains('btn-ban')) {
      const id = e.target.dataset.id;
      try {
        const res = await fetch(`/api/admin/users/${id}/ban`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
        });
        const j = await res.json();
        if (res.ok) {
          showToast(j.message);
          fetchUsers(); // refresh
        } else showToast(j.message || 'Error');
      } catch (err) {
        showToast('Network error');
      }
    } else if (e.target.classList.contains('btn-view')) {
      const id = e.target.dataset.id;
      window.location.href = `/admin/users/${id}`; // route to user detail EJS (below)
    } else if (e.target.closest('.page-link')) {
      e.preventDefault();
      const page = e.target.dataset.page || 1;
      fetchUsers(page, qInput.value.trim());
    }
  });

  btnSearch.addEventListener('click', ()=> fetchUsers(1, qInput.value.trim()));

  // initial
  fetchUsers();
})();
