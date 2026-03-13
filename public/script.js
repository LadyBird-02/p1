// public/script.js - frontend logic for register/login/home
const apiRoot = ''; // same origin

function saveToken(t) { localStorage.setItem('token', t); }
function getToken() { return localStorage.getItem('token'); }
function authHeaders() { return { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' }; }

// --- Register ---
async function doRegister() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  if (!name || !email || !password) { alert('Enter name, email, password'); return; }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, role })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Registration failed');
      return;
    }
    saveToken(data.token);
    window.location = 'home.html';
  } catch (e) {
    alert('Network error');
    console.error(e);
  }
}

// --- Login ---
async function doLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) { alert('Enter email and password'); return; }

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Login failed');
      return;
    }
    saveToken(data.token);
    window.location = 'home.html';
  } catch (e) {
    alert('Network error');
    console.error(e);
  }
}

// --- Logout ---
function logout() {
  localStorage.removeItem('token');
  window.location = 'login.html';
}

// --- Home page logic ---
async function loadHomePage() {
  try {
    const meRes = await fetch('/me', { headers: authHeaders() });
    if (!meRes.ok) { logout(); return; }
    const me = await meRes.json();
    document.getElementById('userInfo').innerText = `${me.name} (${me.role})`;

    const content = document.getElementById('content');
    if (me.role === 'admin') {
      content.innerHTML = `
        <div class="form-container">
          <h3>Admin Dashboard</h3>
          <p class="small">View all complaints and change status.</p>
        </div>
        <div id="adminList"></div>
      `;
      loadComplaints(true);
    } else {
      content.innerHTML = `
        <div class="form-container">
          <h3>Submit Complaint</h3>
          <input id="title" placeholder="Title" />
          <input id="category" placeholder="Category" />
          <input id="priority" placeholder="Priority (Low / Medium / High)" />
          <textarea id="description" placeholder="Description"></textarea>
          <button onclick="submitComplaint()">Submit Complaint</button>
        </div>
        <h3>Your Complaints</h3>
        <div id="userList"></div>
      `;
      document.getElementById('title').focus();
      loadComplaints(false);
    }
  } catch (e) {
    console.error(e);
    logout();
  }
}

// --- Submit Complaint ---
async function submitComplaint() {
  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const priority = document.getElementById('priority').value.trim();
  const description = document.getElementById('description').value.trim();
  if (!title || !description) { alert('Provide title and description'); return; }
  try {
    const res = await fetch('/complaint', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, category, priority, description })
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Submit failed'); return; }
    alert('Complaint submitted');
    loadComplaints(false);
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
  } catch (e) {
    alert('Network error'); console.error(e);
  }
}

// --- Load complaints ---
async function loadComplaints(isAdmin) {
  const target = isAdmin ? document.getElementById('adminList') : document.getElementById('userList');
  if (!target) return;
  target.innerHTML = '<p class="small">Loading...</p>';
  try {
    const res = await fetch('/complaints', { headers: authHeaders() });
    if (!res.ok) { target.innerHTML = '<p class="small">Failed to load</p>'; return; }
    const list = await res.json();
    if (!list.length) { target.innerHTML = '<p class="small">No complaints found</p>'; return; }

    target.innerHTML = '';
    list.forEach(c => {
      const div = document.createElement('div');
      div.className = 'complaint';
      div.innerHTML = `
        <strong>${escapeHtml(c.title)}</strong>
        <div class="small">By: ${escapeHtml(c.userName || '')} | ${escapeHtml(c.category||'')} | Priority: ${escapeHtml(c.priority||'')}</div>
        <p>${escapeHtml(c.description || '')}</p>
        <div class="small">Status: <strong>${escapeHtml(c.status || '')}</strong></div>
        <div class="small">History: ${ (c.updates || []).map(u => `${escapeHtml(u.status)} (${new Date(u.date).toLocaleString()})`).join(' → ') }</div>
      `;

      if (isAdmin) {
        const sel = document.createElement('select');
        ['Pending','In Progress','Resolved'].forEach(s => {
          const o = document.createElement('option');
          o.value = s; o.innerText = s;
          if (s === c.status) o.selected = true;
          sel.appendChild(o);
        });
        const btn = document.createElement('button');
        btn.innerText = 'Update';
        btn.style.marginLeft = '8px';
        btn.onclick = async () => {
          const newStatus = sel.value;
          const r = await fetch(`/complaint/${c._id}/status`, {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: newStatus })
          });
          if (r.ok) { alert('Updated'); loadComplaints(true); }
          else { const d = await r.json(); alert(d.error || 'Update failed'); }
        };
        div.appendChild(sel);
        div.appendChild(btn);
      }

      target.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    target.innerHTML = '<p class="small">Error loading</p>';
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[ch]);
}

/* If home.html loaded, call loadHomePage automatically */
if (window.location.pathname.endsWith('home.html')) {
  document.addEventListener('DOMContentLoaded', loadHomePage);
}