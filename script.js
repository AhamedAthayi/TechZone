/* ============================================================
   NOTE ON DATA STORAGE
   This is a front-end-only coursework demo: there is no real
   server or database. Accounts, passwords, carts and orders are
   all kept in the browser's localStorage, so everything works
   fully client-side and survives a page reload -- but it only
   lives on this device/browser, and passwords are NOT encrypted.
   A real store would replace this with a server + database
   (e.g. Node/Express + PostgreSQL, or Firebase) handling auth
   and orders securely.
   ============================================================ */

const DB = {
  get users() { return JSON.parse(localStorage.getItem('tz_users') || '[]'); },
  set users(v) { localStorage.setItem('tz_users', JSON.stringify(v)); },

  get session() { return JSON.parse(localStorage.getItem('tz_session') || 'null'); },
  set session(v) { localStorage.setItem('tz_session', JSON.stringify(v)); },

  get cart() { return JSON.parse(localStorage.getItem('tz_cart') || '[]'); },
  set cart(v) { localStorage.setItem('tz_cart', JSON.stringify(v)); },

  ordersFor(email) {
    const all = JSON.parse(localStorage.getItem('tz_orders') || '{}');
    return all[email] || [];
  },
  addOrder(email, order) {
    const all = JSON.parse(localStorage.getItem('tz_orders') || '{}');
    all[email] = all[email] || [];
    all[email].unshift(order);
    localStorage.setItem('tz_orders', JSON.stringify(all));
  }
};

// ============================================================
// Mobile nav toggle
// ============================================================
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ============================================================
// Toast helper
// ============================================================
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ============================================================
// Overlay + drawers
// ============================================================
const overlay = document.getElementById('overlay');
const cartDrawer = document.getElementById('cartDrawer');
const acctDrawer = document.getElementById('acctDrawer');

function closeDrawers() {
  cartDrawer.classList.remove('open');
  acctDrawer.classList.remove('open');
  overlay.classList.remove('active');
}
function openDrawer(drawer) {
  closeDrawers();
  drawer.classList.add('open');
  overlay.classList.add('active');
}
overlay.addEventListener('click', closeDrawers);
document.getElementById('closeCart').addEventListener('click', closeDrawers);
document.getElementById('closeAcct').addEventListener('click', closeDrawers);

// ============================================================
// CART
// ============================================================
const cartCountEl = document.getElementById('cartCount');
const cartItemsEl = document.getElementById('cartItems');
const cartSubtotalEl = document.getElementById('cartSubtotal');

function renderCart() {
  const cart = DB.cart;
  cartCountEl.textContent = cart.reduce((n, i) => n + i.qty, 0);

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
    cartSubtotalEl.textContent = '$0';
    return;
  }

  let subtotal = 0;
  cartItemsEl.innerHTML = cart.map(item => {
    subtotal += item.price * item.qty;
    return `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-icon">◈</div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>$${item.price} each</p>
          <div class="qty-controls">
            <button class="qty-dec">−</button>
            <span>${item.qty}</span>
            <button class="qty-inc">+</button>
            <button class="remove-item">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
  cartSubtotalEl.textContent = '$' + subtotal.toLocaleString();
}

function addToCart(id, name, price) {
  const cart = DB.cart;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, name, price, qty: 1 });
  DB.cart = cart;
  renderCart();
}

cartItemsEl.addEventListener('click', (e) => {
  const row = e.target.closest('.cart-item');
  if (!row) return;
  const id = row.dataset.id;
  let cart = DB.cart;
  const item = cart.find(i => i.id === id);
  if (!item) return;

  if (e.target.classList.contains('qty-inc')) item.qty += 1;
  if (e.target.classList.contains('qty-dec')) item.qty = Math.max(1, item.qty - 1);
  if (e.target.classList.contains('remove-item')) cart = cart.filter(i => i.id !== id);

  DB.cart = cart;
  renderCart();
});

document.querySelectorAll('.add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const { id, name, price } = btn.dataset;
    addToCart(id, name, Number(price));
    btn.textContent = 'Added ✓';
    btn.classList.add('just-added');
    setTimeout(() => {
      btn.textContent = 'Add to cart';
      btn.classList.remove('just-added');
    }, 1200);
    showToast(`${name} added to cart`);
  });
});

document.getElementById('cartBtn').addEventListener('click', () => openDrawer(cartDrawer));

// ============================================================
// ACCOUNT / AUTH (client-side simulation, see note above)
// ============================================================
const acctBtn = document.getElementById('acctBtn');
const acctLabel = document.getElementById('acctLabel');
const acctDrawerTitle = document.getElementById('acctDrawerTitle');
const authView = document.getElementById('authView');
const accountView = document.getElementById('accountView');

const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');
const tabBtns = document.querySelectorAll('.tab-btn');

tabBtns.forEach(tab => {
  tab.addEventListener('click', () => {
    tabBtns.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isSignin = tab.dataset.tab === 'signin';
    signinForm.classList.toggle('hidden', !isSignin);
    signupForm.classList.toggle('hidden', isSignin);
  });
});

function refreshAcctUI() {
  const session = DB.session;
  if (session) {
    acctLabel.textContent = session.name.split(' ')[0];
    acctDrawerTitle.textContent = 'My account';
    authView.classList.add('hidden');
    accountView.classList.remove('hidden');

    document.getElementById('acctAvatar').textContent = session.name[0].toUpperCase();
    document.getElementById('acctName').textContent = session.name;
    document.getElementById('acctEmail').textContent = session.email;

    const orders = DB.ordersFor(session.email);
    const historyEl = document.getElementById('orderHistory');
    if (orders.length === 0) {
      historyEl.innerHTML = '<p class="empty-msg">No orders yet.</p>';
    } else {
      historyEl.innerHTML = orders.map(o => `
        <div class="order">
          <div class="order-top"><span>${o.date}</span><span>#${o.id}</span></div>
          <div class="order-items">${o.items.map(i => `${i.qty}× ${i.name}`).join('<br>')}</div>
          <div class="order-total">$${o.total.toLocaleString()}</div>
        </div>`).join('');
    }
  } else {
    acctLabel.textContent = 'Sign in';
    acctDrawerTitle.textContent = 'Sign in';
    authView.classList.remove('hidden');
    accountView.classList.add('hidden');
  }
}

acctBtn.addEventListener('click', () => openDrawer(acctDrawer));
document.getElementById('footerSignIn').addEventListener('click', (e) => { e.preventDefault(); openDrawer(acctDrawer); });
document.getElementById('footerOrders').addEventListener('click', (e) => { e.preventDefault(); openDrawer(acctDrawer); });

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(signupForm));
  const errorEl = document.getElementById('signupError');
  const users = DB.users;

  if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    errorEl.textContent = 'An account with this email already exists.';
    return;
  }
  errorEl.textContent = '';
  users.push({ name: data.name, email: data.email, password: data.password });
  DB.users = users;
  DB.session = { name: data.name, email: data.email };
  signupForm.reset();
  refreshAcctUI();
  showToast(`Welcome, ${data.name.split(' ')[0]}!`);
});

signinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(signinForm));
  const errorEl = document.getElementById('signinError');
  const user = DB.users.find(u =>
    u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password
  );

  if (!user) {
    errorEl.textContent = 'No account matches that email and password.';
    return;
  }
  errorEl.textContent = '';
  DB.session = { name: user.name, email: user.email };
  signinForm.reset();
  refreshAcctUI();
  showToast(`Welcome back, ${user.name.split(' ')[0]}!`);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  DB.session = null;
  refreshAcctUI();
  closeDrawers();
  showToast('Signed out');
});

// ============================================================
// CHECKOUT
// ============================================================
document.getElementById('checkoutBtn').addEventListener('click', () => {
  const cart = DB.cart;
  if (cart.length === 0) {
    showToast('Your cart is empty');
    return;
  }
  const session = DB.session;
  if (!session) {
    closeDrawers();
    openDrawer(acctDrawer);
    showToast('Sign in to complete checkout');
    return;
  }

  const total = cart.reduce((n, i) => n + i.price * i.qty, 0);
  const order = {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    items: cart.map(i => ({ name: i.name, qty: i.qty })),
    total
  };
  DB.addOrder(session.email, order);
  DB.cart = [];
  renderCart();
  refreshAcctUI();
  closeDrawers();
  showToast(`Order #${order.id} placed — thank you!`);
});

// Initial render
renderCart();
refreshAcctUI();

// ============================================================
// 3D hero ring — drag to spin, otherwise auto-rotates via CSS
// ============================================================
const ring = document.getElementById('ring');
if (ring) {
  let isDragging = false;
  let startX = 0;
  let currentRotation = 0;
  let baseRotation = 0;
  const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

  const startDrag = (e) => {
    isDragging = true;
    startX = getX(e);
    ring.style.animationPlayState = 'paused';
    ring.style.cursor = 'grabbing';
  };
  const duringDrag = (e) => {
    if (!isDragging) return;
    const deltaX = getX(e) - startX;
    currentRotation = baseRotation + deltaX * 0.4;
    ring.style.transform = `rotateY(${currentRotation}deg) rotateX(6deg)`;
  };
  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    baseRotation = currentRotation;
    ring.style.cursor = 'grab';
    ring.style.animation = 'none';
    requestAnimationFrame(() => {
      ring.style.transform = `rotateY(${currentRotation}deg) rotateX(6deg)`;
      ring.style.animation = 'spin 26s linear infinite';
    });
  };

  ring.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', duringDrag);
  window.addEventListener('mouseup', endDrag);
  ring.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('touchmove', duringDrag, { passive: true });
  window.addEventListener('touchend', endDrag);
}

// ============================================================
// Product card 3D tilt-on-hover
// ============================================================
const tiltCards = document.querySelectorAll('[data-tilt]');
const MAX_TILT = 8;
tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width - 0.5) * 2;
    const percentY = (y / rect.height - 0.5) * 2;
    const rotateY = percentX * MAX_TILT;
    const rotateX = -percentY * MAX_TILT;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0)';
  });
});

// Respect reduced-motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion && ring) {
  ring.style.animation = 'none';
  ring.style.transform = 'rotateY(0deg) rotateX(6deg)';
}
