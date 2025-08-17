import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const db = window.firebaseDB;

let currentUser = null;
let products = [];
let cart = [];
let users = [];
let currentProductImages = [];
let currentImageIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadFirestoreProducts();
  loadFirestoreUsers();
  loadCart();
  checkUserRegistration();
  setupEventListeners();
  renderProducts();
  updateCartUI();
  setupLightbox();
  setupAdminListeners();
});

function loadFirestoreProducts() {
  const productsCol = collection(db, "products");
  onSnapshot(productsCol, (snapshot) => {
    products = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    renderProducts();
  });
}

function loadFirestoreUsers() {
  const usersCol = collection(db, "users");
  onSnapshot(usersCol, (snapshot) => {
    users = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    renderUsersAdmin();
    updateAdminStats();
  });
}

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem("marcshop-cart")) || [];
    currentUser = JSON.parse(localStorage.getItem("marcshop-current-user"));
  } catch (e) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem("marcshop-cart", JSON.stringify(cart));
  if (currentUser) {
    localStorage.setItem("marcshop-current-user", JSON.stringify(currentUser));
  }
}

function checkUserRegistration() {
  if (!currentUser) {
    setTimeout(() => {
      document.getElementById("registrationModal").classList.add("active");
    }, 1000);
  }
}

function setupEventListeners() {
  document.getElementById("registrationForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("userName").value.trim();
    const email = document.getElementById("userEmail").value.trim();
    const phone = document.getElementById("userPhone").value.trim();

    if (name && email && phone) {
      await registerUser(name, email, phone);
    }
  });

  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      filterByCategory(this.dataset.category);
    });
  });

  document.getElementById("overlay").addEventListener("click", () => {
    closeAllPanels();
  });
}

function setupLightbox() {
  const lightbox = document.getElementById("productLightbox");
  const closeBtn = lightbox.querySelector(".close");
  const prevBtn = lightbox.querySelector(".prev");
  const nextBtn = lightbox.querySelector(".next");
  
  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => changeImage(-1));
  nextBtn.addEventListener("click", () => changeImage(1));
  
  window.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

function setupAdminListeners() {
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", function(e) {
      e.preventDefault();
      alert("L'ajout de produit est réservé à l'administrateur via la page admin.");
    });
    const submitBtn = productForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.background = "#ccc";
      submitBtn.title = "Ajout réservé à l'admin";
    }
  }
  const adminBtn = document.querySelector(".admin-btn");
  if (adminBtn) {
    adminBtn.addEventListener("click", toggleAdmin);
  }
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      switchTab(this.dataset.tab);
    });
  });
}

window.openLightbox = openLightbox;
function openLightbox(productId, imgIndex = 0) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.images || product.images.length === 0) return;
  
  currentProductImages = product.images;
  currentImageIndex = imgIndex;
  
  const lightboxImg = document.getElementById("lightboxImage");
  lightboxImg.src = currentProductImages[currentImageIndex];
  document.getElementById("productLightbox").style.display = "block";
  document.getElementById("overlay").classList.add("active");
}

function closeLightbox() {
  document.getElementById("productLightbox").style.display = "none";
  document.getElementById("overlay").classList.remove("active");
}

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex < 0) {
    currentImageIndex = currentProductImages.length - 1;
  } else if (currentImageIndex >= currentProductImages.length) {
    currentImageIndex = 0;
  }
  const lightboxImg = document.getElementById("lightboxImage");
  lightboxImg.src = currentProductImages[currentImageIndex];
}

// Inscription utilisateur - ENREGISTRE sur Firestore
async function registerUser(name, email, phone) {
  const newUser = {
    name: name,
    email: email,
    phone: phone,
    registeredAt: new Date().toISOString(),
    isActive: true,
    lastActivity: new Date().toISOString(),
  };
  try {
    const ref = await addDoc(collection(db, "users"), newUser);
    newUser.id = ref.id;
    currentUser = newUser;
    saveCart();
    document.getElementById("registrationModal").classList.remove("active");
  } catch (e) {
    alert("Erreur lors de l'inscription. Réessayez.");
    console.error(e);
  }
}

// Affichage des produits
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const sortedProducts = [...products].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (sortedProducts.length === 0) {
    grid.innerHTML = `
      <div class="no-products">
        <h3>Aucun produit disponible</h3>
        <p>Les produits seront affichés ici une fois ajoutés par l'administrateur.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = sortedProducts.map(product => {
    const discount = product.originalPrice > 0 ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const rating = 4.0 + Math.random() * 1.0;
    const reviews = Math.floor(Math.random() * 1000) + 100;
    const firstImage = product.images[0] || "https://via.placeholder.com/200?text=Image+Manquante";
    return `
      <div class="product-card" data-category="${product.category}">
        <div class="product-image" onclick="openLightbox('${product.id}')">
          <img src="${firstImage}" alt="${product.name}" class="product-img">
          <div class="product-badge">NOUVEAU</div>
          <div class="discount-badge">-${discount}%</div>
        </div>
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-rating">
            <span class="stars">${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))}</span>
            <span>(${reviews})</span>
          </div>
          <div class="product-price">
            <span class="current-price">$${product.price.toFixed(2)}</span>
            <span class="original-price">$${product.originalPrice.toFixed(2)}</span>
          </div>
          <button class="add-to-cart" onclick="addToCart('${product.id}'); event.stopPropagation()">
            <i class="fas fa-shopping-cart"></i> Ajouter
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// Filtrage par catégorie
function filterByCategory(category) {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-category="${category}"]`).classList.add("active");

  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    if (category === "all" || card.dataset.category === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

// Gestion du panier
window.addToCart = addToCart;
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: 1,
    });
  }

  saveCart();
  updateCartUI();

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check"></i> Ajouté!';
  btn.style.background = "#059669";
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.background = "#10b981";
  }, 1000);
}

window.removeFromCart = removeFromCart;
function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  updateCartUI();
}

window.updateQuantity = updateQuantity;
function updateQuantity(productId, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity = newQuantity;
    saveCart();
    updateCartUI();
  }
}

function updateCartUI() {
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = totalPrice.toFixed(2);

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Votre panier est vide</p>
      </div>
    `;
  } else {
    cartItems.innerHTML = cart
      .map(
        (item) => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">$${item.price.toFixed(2)}</div>
              <div class="quantity-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                <button class="quantity-btn" onclick="removeFromCart('${item.id}')" style="margin-left: 1rem; color: #ef4444;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }
}

// ADMIN : Affichage utilisateurs
function renderUsersAdmin() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;
  if (!users || users.length === 0) {
    usersList.innerHTML = "<p>Aucun utilisateur inscrit.</p>";
    return;
  }
  usersList.innerHTML = users.map(user => `
    <div class="admin-user-card" style="background:white; margin-bottom:1rem; border-radius:0.5rem; padding:1rem;">
      <strong>${user.name}</strong><br>
      <span>${user.email}</span><br>
      <span>${user.phone}</span><br>
      <small>Inscrit le : ${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : ""}</small>
    </div>
  `).join("");
}
function updateAdminStats() {
  const totalUsers = document.getElementById("totalUsers");
  if (totalUsers) totalUsers.textContent = users.length;
  // Optionnel : calculer "actifs" selon lastActivity < 24h
  const activeUsers = document.getElementById("activeUsers");
  if (activeUsers) {
    const active = users.filter(u => {
      if (!u.lastActivity) return false;
      const last = new Date(u.lastActivity);
      return (new Date() - last) < 24*60*60*1000;
    });
    activeUsers.textContent = active.length;
  }
}

// Interface utilisateur
function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("overlay");
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

function toggleAdmin() {
  const panel = document.getElementById("adminPanel");
  const overlay = document.getElementById("overlay");
  panel.classList.toggle("active");
  overlay.classList.toggle("active");
}

function closeAllPanels() {
  document.getElementById("cartSidebar").classList.remove("active");
  document.getElementById("adminPanel").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
  closeLightbox();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}Tab`).classList.add("active");
}

function shareWebsite() {
  const url = window.location.href;
  const text = "Découvrez MarcShop - La meilleure boutique en ligne pour tous vos besoins!";
  if (navigator.share) {
    navigator.share({ title: "MarcShop", text: text, url: url });
  } else {
    navigator.clipboard.writeText(url).then(() => {
      alert("Lien copié dans le presse-papiers!");
    });
  }
}

function checkout() {
  if (cart.length === 0) {
    alert("Votre panier est vide!");
    return;
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  alert(
    `Commande confirmée!\n${itemCount} article(s) pour un total de $${total.toFixed(2)}\n\nMerci pour votre achat sur MarcShop!`
  );
  cart = [];
  saveCart();
  updateCartUI();
  closeAllPanels();
}
