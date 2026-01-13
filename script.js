import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = window.firebaseDB;

let currentUser = null;
let products = [];
let allProducts = [];
let filteredProducts = [];
let cart = [];
let users = [];
let currentProductImages = [];
let currentImageIndex = 0;
let isAddingToCart = false;
let searchTerm = '';
let currentCategory = 'all';
let activityIntervalId = null;

// Configuration NatCash
const NATCASH_CONFIG = {
  merchantNumber: "50942557123", // Votre numéro NatCash marchand
  collectionName: "natcash_payments",
  ordersCollection: "orders",
  cartsCollection: "carts"
};

// Options par catégorie
const SIZE_OPTIONS = {
  clothing: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  shoes: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  electronics: ["Standard", "Petit", "Moyen", "Grand", "Extra Large"],
  hair: ["8 pouces", "10 pouces", "12 pouces", "14 pouces","16 pouces","18 pouces","20 pouces","22 pouces","24 pouces","26 pouces","28 pouces","30 pouces"],
  beauty: ["100ml", "200ml", "250ml", "500ml", "1L"],
  default: ["Unique", "Standard", "Personnalisé"]
};

const COLORS = ["Blanc", "Noir", "Rouge", "Bleu", "Vert", "Jaune", "Rose", "Violet", "Orange", "Gris", "Marron", "Beige"];

document.addEventListener("DOMContentLoaded", () => {
  loadFirestoreProducts();
  loadFirestoreUsers();
  loadCart();
  checkUserRegistration();
  setupEventListeners();
  setupLightbox();
  
  // RENDRE LES FONCTIONS GLOBALES POUR LES ONCLICK HTML
  window.toggleCart = toggleCart;
  window.openLightbox = openLightbox;
  window.addToCart = addToCart;
  window.updateQuantity = updateQuantity;
  window.removeFromCart = removeFromCart;
});

function loadFirestoreProducts() {
  try {
    const productsCol = collection(db, "products");
    onSnapshot(productsCol, 
      (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // Mélanger aléatoirement les produits
        products = shuffleArray([...allProducts]);
        
        // Appliquer les filtres actuels (recherche et catégorie)
        applyFilters();
      },
      (error) => {
        console.error("Erreur Firestore products:", error);
        showFirestoreError("Impossible de charger les produits. Vérifiez votre connexion Internet.");
      }
    );
  } catch (error) {
    console.error("Erreur initialisation Firestore products:", error);
    showFirestoreError("Erreur de connexion à la base de données.");
  }
}

function loadFirestoreUsers() {
  try {
    const usersCol = collection(db, "users");
    onSnapshot(usersCol, 
      (snapshot) => {
        users = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
      },
      (error) => {
        console.error("Erreur Firestore users:", error);
      }
    );
  } catch (error) {
    console.error("Erreur initialisation Firestore users:", error);
  }
}

// Fonction pour afficher les erreurs Firestore
function showFirestoreError(message) {
  const grid = document.getElementById("productsGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 2rem; color: #ef4444;">
        <h3>😕 Problème de connexion</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer; margin-top: 1rem;">
          Actualiser la page
        </button>
      </div>
    `;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function loadCart() {
  try {
    const cartData = localStorage.getItem("marcshop-cart");
    const userData = localStorage.getItem("marcshop-current-user");
    cart = cartData ? JSON.parse(cartData) : [];
    currentUser = userData ? JSON.parse(userData) : null;
    
    // Démarrer le suivi d'activité si l'utilisateur est connecté
    if (currentUser) {
      setupUserActivityTracking();
    }
  } catch (e) {
    console.error("Error parsing cart or user data from localStorage", e);
    cart = [];
    currentUser = null;
  }
  updateCartUI();
  
  // Synchroniser le panier avec Firestore si l'utilisateur est connecté
  if (currentUser) {
    syncCartToFirestore();
  }
}

// Synchroniser le panier avec Firestore
async function syncCartToFirestore() {
  if (!currentUser) return;
  
  try {
    // Vérifier si l'utilisateur a déjà un panier dans Firestore
    const cartsQuery = query(collection(db, NATCASH_CONFIG.cartsCollection), where("userId", "==", currentUser.id));
    const querySnapshot = await getDocs(cartsQuery);
    
    if (!querySnapshot.empty) {
      // Mettre à jour le panier existant
      const cartDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, NATCASH_CONFIG.cartsCollection, cartDoc.id), {
        items: cart,
        totalAmount: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Créer un nouveau panier
      await addDoc(collection(db, NATCASH_CONFIG.cartsCollection), {
        userId: currentUser.id,
        items: cart,
        totalAmount: cart.reduce((total, item) => total + (item.price * item.quantity), 0),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Erreur synchronisation panier:", error);
  }
}

// Mettre à jour l'activité de l'utilisateur
async function updateUserActivity() {
  if (!currentUser) return;
  
  try {
    const userRef = doc(db, "users", currentUser.id);
    await updateDoc(userRef, {
      lastActivity: new Date().toISOString(),
      isOnline: true
    });
  } catch (error) {
    console.error("Erreur mise à jour activité:", error);
  }
}

// Configurer le suivi d'activité de l'utilisateur
function setupUserActivityTracking() {
  if (!currentUser) return;
  
  // Mettre à jour l'activité immédiatement
  updateUserActivity();
  
  // Nettoyer l'ancien intervalle s'il existe
  if (activityIntervalId) {
    clearInterval(activityIntervalId);
  }
  
  // Mettre à jour l'activité toutes les minutes
  activityIntervalId = setInterval(updateUserActivity, 60000);
  
  // Mettre à jour l'activité lorsque la page devient visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateUserActivity();
    }
  });
  
  // Mettre isOnline à false lorsque l'utilisateur quitte la page
  window.addEventListener('beforeunload', async () => {
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, { isOnline: false });
      } catch (error) {
        console.error("Erreur mise à jour statut hors ligne:", error);
      }
    }
  });
}

function saveCart() {
  localStorage.setItem("marcshop-cart", JSON.stringify(cart));
  if (currentUser) {
    localStorage.setItem("marcshop-current-user", JSON.stringify(currentUser));
    updateUserActivity();
    syncCartToFirestore();
  }
  updateCartUI();
}

function checkUserRegistration() {
  if (!currentUser) {
    setTimeout(() => {
      const registrationModal = document.getElementById("registrationModal");
      if (registrationModal) {
        registrationModal.classList.add("active");
      }
    }, 1000);
  } else {
    const registrationModal = document.getElementById("registrationModal");
    if (registrationModal) {
      registrationModal.classList.remove("active");
    }
    displayUserName();
  }
}

function setupEventListeners() {
  // Vérification robuste de tous les éléments avant d'ajouter des event listeners
  const registrationForm = document.getElementById("registrationForm");
  const shareBtn = document.getElementById("shareBtn");
  const userLogo = document.querySelector(".user-logo");
  const profileBtn = document.getElementById("profileBtn");
  const overlay = document.getElementById("overlay");
  const searchInput = document.getElementById("searchInput");
  const clearSearch = document.getElementById("clearSearch");
  const searchIcon = document.getElementById("searchIcon");
  const natcashPaymentBtn = document.getElementById("natcash-payment-btn");
  const natcashForm = document.getElementById("natcashForm");
  const cancelNatcash = document.getElementById("cancelNatcash");

  // Formulaire d'inscription
  if (registrationForm) {
    registrationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("userName")?.value.trim();
      const email = document.getElementById("userEmail")?.value.trim();
      const phone = document.getElementById("userPhone")?.value.trim();
      if (name && email && phone) {
        await registerUser(name, email, phone);
      }
    });
  } else {
    console.warn("Élément #registrationForm introuvable");
  }

  // Bouton de partage
  if (shareBtn) {
    shareBtn.addEventListener("click", shareWebsite);
  } else {
    console.warn("Élément #shareBtn introuvable");
  }

  // Logo utilisateur et profil
  if (userLogo) {
    userLogo.addEventListener("click", showUserProfile);
  }
  if (profileBtn) {
    profileBtn.addEventListener("click", showUserProfile);
  }

  // Boutons de catégorie
  const categoryButtons = document.querySelectorAll(".category-btn");
  if (categoryButtons.length > 0) {
    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        currentCategory = this.dataset.category;
        filterByCategory(this.dataset.category);
      });
    });
  } else {
    console.warn("Aucun bouton .category-btn trouvé");
  }

  // Overlay
  if (overlay) {
    overlay.addEventListener("click", () => {
      closeAllPanels();
    });
  }

  // Recherche de produits
  if (searchInput && clearSearch && searchIcon) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      clearSearch.style.display = searchTerm ? 'block' : 'none';
      applyFilters();
    });
    
    clearSearch.addEventListener("click", () => {
      searchInput.value = '';
      searchTerm = '';
      clearSearch.style.display = 'none';
      applyFilters();
    });
    
    searchIcon.addEventListener("click", () => {
      applyFilters();
    });
  } else {
    console.warn("Éléments de recherche introuvables");
  }

  // Événements pour NatCash
  if (natcashPaymentBtn) {
    natcashPaymentBtn.addEventListener("click", openNatcashModal);
  } else {
    console.warn("Élément #natcash-payment-btn introuvable");
  }

  if (natcashForm) {
    natcashForm.addEventListener("submit", processNatcashPayment);
  } else {
    console.warn("Élément #natcashForm introuvable");
  }

  if (cancelNatcash) {
    cancelNatcash.addEventListener("click", closeNatcashModal);
  } else {
    console.warn("Élément #cancelNatcash introuvable");
  }
}

function applyFilters() {
  // Filtrer d'abord par catégorie
  if (currentCategory === 'all') {
    filteredProducts = [...products];
  } else {
    filteredProducts = products.filter(product => product.category === currentCategory);
  }
  
  // Puis filtrer par terme de recherche
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm))
    );
  }
  
  renderProducts();
}

function setupLightbox() {
  const lightbox = document.getElementById("productLightbox");
  if (!lightbox) {
    console.warn("Élément #productLightbox introuvable");
    return;
  }

  const closeBtn = lightbox.querySelector(".close");
  const prevBtn = lightbox.querySelector(".prev");
  const nextBtn = lightbox.querySelector(".next");
  
  if (closeBtn) {
    closeBtn.addEventListener("click", closeLightbox);
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => changeImage(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => changeImage(1));
  }
  
  window.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

function openLightbox(productId, imgIndex = 0) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.images || product.images.length === 0) return;
  currentProductImages = product.images;
  currentImageIndex = imgIndex;
  const lightboxImg = document.getElementById("lightboxImage");
  const descriptionDiv = document.getElementById("lightboxDescription");
  
  if (!lightboxImg) return;
  
  lightboxImg.src = currentProductImages[currentImageIndex];
  
  // Afficher la description du produit si elle existe
  if (product.description && descriptionDiv) {
    descriptionDiv.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.description}</p>
    `;
    descriptionDiv.style.display = 'block';
  } else if (descriptionDiv) {
    descriptionDiv.style.display = 'none';
  }
  
  const lightbox = document.getElementById("productLightbox");
  const overlay = document.getElementById("overlay");
  if (lightbox) lightbox.style.display = "block";
  if (overlay) overlay.classList.add("active");
}

function closeLightbox() {
  const lightbox = document.getElementById("productLightbox");
  const overlay = document.getElementById("overlay");
  if (lightbox) lightbox.style.display = "none";
  if (overlay) overlay.classList.remove("active");
}

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex < 0) {
    currentImageIndex = currentProductImages.length - 1;
  } else if (currentImageIndex >= currentProductImages.length) {
    currentImageIndex = 0;
  }
  const lightboxImg = document.getElementById("lightboxImage");
  if (lightboxImg) {
    lightboxImg.src = currentProductImages[currentImageIndex];
  }
}

async function registerUser(name, email, phone) {
  const newUser = {
    name: name,
    email: email,
    phone: phone,
    registeredAt: new Date().toISOString(),
    isActive: true,
    lastActivity: new Date().toISOString(),
    isOnline: true
  };
  try {
    const ref = await addDoc(collection(db, "users"), newUser);
    newUser.id = ref.id;
    currentUser = newUser;
    saveCart();
    displayUserName();
    
    // Démarrer le suivi d'activité pour le nouvel utilisateur
    setupUserActivityTracking();
    
    // Créer un panier Firestore pour le nouvel utilisateur
    await syncCartToFirestore();
    
    const registrationModal = document.getElementById("registrationModal");
    if (registrationModal) {
      registrationModal.classList.remove("active");
    }
  } catch (e) {
    alert("Erreur lors de l'inscription. Réessayez.");
    console.error(e);
  }
}

function displayUserName() {
  const name = currentUser && currentUser.name ? currentUser.name : "MarcShop";
  const userNameDisplay = document.getElementById("userNameDisplay");
  if (userNameDisplay) {
    userNameDisplay.textContent = name;
  }
}

function showUserProfile() {
  if (!currentUser) return;
  alert(`Bienvenue ${currentUser.name}\nEmail : ${currentUser.email}\nTéléphone : ${currentUser.phone}`);
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  
  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="no-products">
        <h3>Aucun produit trouvé</h3>
        <p>Aucun produit ne correspond à votre recherche.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = filteredProducts.map(product => {
    const discount = product.originalPrice > 0 ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    const rating = 4.0 + Math.random() * 1.0;
    const reviews = Math.floor(Math.random() * 1000) + 100;
    const firstImage = product.images[0] || "https://via.placeholder.com/200?text=Image+Manquante";
    return `
      <div class="product-card" data-category="${product.category}">
        <div class="product-image" onclick="openLightbox('${product.id}')">
          <img src="${firstImage}" alt="${product.name}" class="product-img">
          <div class="product-badge">NOUVEAU</div>
          ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-rating">
            <span class="stars">${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))}</span>
            <span>(${reviews})</span>
          </div>
          <div class="product-price">
            <span class="current-price">$${product.price.toFixed(2)}</span>
            ${product.originalPrice > 0 ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
          </div>
          <button class="add-to-cart" onclick="addToCart('${product.id}'); event.stopPropagation()">
            <i class="fas fa-shopping-cart"></i> Ajouter
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function addToCart(productId) {
  if (isAddingToCart) return;
  
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  
  isAddingToCart = true;
  openProductOptions(product);
}

function openProductOptions(product) {
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.classList.add("active");
  }
  
  // Déterminer les options de taille en fonction de la catégorie
  const category = product.category || 'default';
  const sizeOptions = SIZE_OPTIONS[category] || SIZE_OPTIONS.default;
  
  let modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:400px;">
      <h3>Ajouter au panier</h3>
      <img src="${product.images[0]}" style="max-width:120px;max-height:120px;border-radius:6px;">
      <p><strong>${product.name}</strong></p>
      <form id="optionsForm">
        <label for="cartSize">Taille/Modèle :</label>
        <select id="cartSize" name="size" required>
          <option value="">Sélectionner</option>
          ${sizeOptions.map(s => `<option value="${s}">${s}</option>`).join("")}
        </select>
        <label for="cartColor" style="margin-top:1rem;">Couleur :</label>
        <select id="cartColor" name="color" required>
          <option value="">Sélectionner</option>
          ${COLORS.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <label for="cartQty" style="margin-top:1rem;">Quantité :</label>
        <input type="number" id="cartQty" name="qty" min="1" value="1" style="width:60px;">
        <button type="submit" id="submitOptions" style="margin-top:1rem;background:#10b981;color:white;">Ajouter au panier</button>
        <button type="button" id="closeOptions" style="margin-top:0.5rem;">Annuler</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeOptions = document.getElementById("closeOptions");
  if (closeOptions) {
    closeOptions.onclick = () => {
      modal.remove(); 
      if (overlay) overlay.classList.remove("active");
      isAddingToCart = false;
    };
  }
  
  const optionsForm = document.getElementById("optionsForm");
  if (optionsForm) {
    optionsForm.onsubmit = function(e) {
      e.preventDefault();
      const form = e.target;
      const submitBtn = document.getElementById("submitOptions");
      if (submitBtn) submitBtn.disabled = true;
      
      // Récupération correcte des valeurs
      const size = form.elements.size.value;
      const color = form.elements.color.value;
      const qty = parseInt(form.elements.qty.value) || 1;
      
      addProductToCart(product, size, color, qty);
      
      modal.remove();
      if (overlay) overlay.classList.remove("active");
      isAddingToCart = false;
    };
  }
}

function addProductToCart(product, size, color, quantity) {
  const key = `${product.id}-${size}-${color}`;
  let existing = cart.find((item) => item.key === key);
  
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      key,
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity,
      size,
      color
    });
  }
  
  saveCart();
  
  // Affiche une confirmation d'ajout
  showCartNotification(`${product.name} ajouté au panier!`);
}

function showCartNotification(message) {
  const notification = document.createElement("div");
  notification.className = "cart-notification";
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animation d'apparition
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  
  // Disparition après 2 secondes
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

function updateCartUI() {
  const cartCount = document.getElementById("cartCount");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cartCount) cartCount.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = totalPrice.toFixed(2);

  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Votre panier est vide</p>
      </div>
    `;
    
    const natcashBtn = document.getElementById("natcash-payment-btn");
    if (natcashBtn) natcashBtn.style.display = 'none';
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div style="font-size:0.9em;color:#666;">${item.size ? `Taille/Modèle: <b>${item.size}</b>, ` : ''}Couleur: <b>${item.color}</b></div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="updateQuantity('${item.key}', ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity('${item.key}', ${item.quantity + 1})">+</button>
            <button class="quantity-btn" onclick="removeFromCart('${item.key}')" style="margin-left: 1rem; color: #ef4444;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join("");
    
    // Afficher le bouton NatCash
    const natcashBtn = document.getElementById("natcash-payment-btn");
    if (natcashBtn) natcashBtn.style.display = 'block';
  }
}

function updateQuantity(key, newQuantity) {
  let item = cart.find((i) => i.key === key);
  if (!item) return;
  if (newQuantity <= 0) {
    cart = cart.filter((i) => i.key !== key);
  } else {
    item.quantity = newQuantity;
  }
  saveCart();
}

function removeFromCart(key) {
  cart = cart.filter((i) => i.key !== key);
  saveCart();
}

// Ouvrir le modal NatCash
function openNatcashModal() {
  // Vérifier si le panier n'est pas vide
  if (cart.length === 0) {
    alert("Votre panier est vide");
    return;
  }
  
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const natcashAmount = document.getElementById("natcashAmount");
  const natcashBusinessNumber = document.getElementById("natcashBusinessNumber");
  const natcashModal = document.getElementById("natcashModal");
  const overlay = document.getElementById("overlay");
  
  if (natcashAmount) natcashAmount.textContent = totalPrice.toFixed(2) + " $";
  if (natcashBusinessNumber) natcashBusinessNumber.textContent = NATCASH_CONFIG.merchantNumber;
  if (natcashModal) natcashModal.style.display = 'flex';
  if (overlay) overlay.classList.add("active");
}

// Fermer le modal NatCash
function closeNatcashModal() {
  const natcashModal = document.getElementById("natcashModal");
  const overlay = document.getElementById("overlay");
  
  if (natcashModal) natcashModal.style.display = 'none';
  if (overlay) overlay.classList.remove("active");
  
  // Réinitialiser le formulaire
  const natcashForm = document.getElementById("natcashForm");
  if (natcashForm) natcashForm.reset();
  
  // Réinitialiser les messages
  const natcashResult = document.getElementById("natcashResult");
  if (natcashResult) natcashResult.innerHTML = '';
}

// Traiter le paiement NatCash
async function processNatcashPayment(e) {
  e.preventDefault();
  
  const transferId = document.getElementById("natcashTransferId")?.value.trim();
  const phoneNumber = document.getElementById("natcashPhone")?.value.trim();
  
  if (!transferId || !phoneNumber) {
    showNatcashResult("❌ Veuillez remplir tous les champs.", 'error');
    return;
  }
  
  // Valider le format du numéro NatCash
  if (!/^6[0-9]{8}$/.test(phoneNumber)) {
    showNatcashResult("❌ Numéro invalide. Format: 6XXXXXXXX", 'error');
    return;
  }
  
  // Valider le format de l'ID de transfert
  if (!/^[A-Z0-9]{8,20}$/i.test(transferId)) {
    showNatcashResult("❌ Format d'ID de transfert invalide. Il doit contenir 8-20 caractères alphanumériques.", 'error');
    return;
  }
  
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Récupérer les informations utilisateur
  const userInfo = currentUser || {
    name: 'Client NatCash',
    email: '',
    phone: phoneNumber
  };
  
  // Préparer les données de commande
  const orderData = {
    orderId: generateOrderId(),
    customerName: userInfo.name,
    customerEmail: userInfo.email,
    customerPhone: userInfo.phone || phoneNumber,
    amount: totalAmount,
    products: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      size: item.size,
      color: item.color
    })),
    totalItems: cart.reduce((sum, item) => sum + item.quantity, 0)
  };
  
  // Désactiver le bouton de soumission
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vérification...';
  submitBtn.disabled = true;
  
  try {
    // Vérifier le paiement NatCash
    const result = await verifyNatcashPayment(transferId, phoneNumber, orderData);
    
    if (result.success) {
      showNatcashResult(result.message, 'success');
      
      // Vider le panier
      cart = [];
      saveCart();
      
      // Fermer les modaux après 2 secondes
      setTimeout(() => {
        closeNatcashModal();
        toggleCart();
        
        // Afficher la confirmation de commande
        showOrderConfirmation(orderData);
      }, 2000);
    } else {
      showNatcashResult(result.message, 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error("Erreur traitement paiement NatCash:", error);
    showNatcashResult("❌ Erreur lors de la vérification. Veuillez réessayer.", 'error');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Vérifier le paiement NatCash
async function verifyNatcashPayment(transferId, phoneNumber, orderData) {
  try {
    // 1. Vérifier si ce transfert existe déjà
    const paymentsRef = collection(db, NATCASH_CONFIG.collectionName);
    const q = query(paymentsRef, where("transferId", "==", transferId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { success: false, message: "❌ Ce transfert a déjà été utilisé." };
    }
    
    // 2. Enregistrer le paiement
    const paymentData = {
      transferId: transferId,
      phoneNumber: phoneNumber,
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      amount: orderData.amount,
      products: orderData.products,
      status: "verified",
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    await addDoc(paymentsRef, paymentData);
    
    // 3. Enregistrer la commande
    const ordersRef = collection(db, NATCASH_CONFIG.ordersCollection);
    const orderDoc = {
      ...orderData,
      paymentMethod: "NatCash",
      paymentStatus: "paid",
      paymentVerified: true,
      natcashTransferId: transferId,
      natcashPhone: phoneNumber,
      orderDate: new Date().toISOString(),
      status: "processing"
    };
    
    await addDoc(ordersRef, orderDoc);
    
    // 4. Vider le panier Firestore si l'utilisateur est connecté
    if (currentUser && currentUser.id) {
      const cartsQuery = query(collection(db, NATCASH_CONFIG.cartsCollection), where("userId", "==", currentUser.id));
      const querySnapshot = await getDocs(cartsQuery);
      
      if (!querySnapshot.empty) {
        const cartDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, NATCASH_CONFIG.cartsCollection, cartDoc.id), {
          items: [],
          totalAmount: 0,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    // 5. Envoyer une notification (simulée)
    await sendOrderConfirmationEmail(orderData, orderData.orderId);
    
    return { 
      success: true, 
      message: "✅ Paiement vérifié ! Votre commande est confirmée." 
    };
    
  } catch (error) {
    console.error("Erreur NatCash:", error);
    return { 
      success: false, 
      message: "❌ Erreur lors de la vérification du paiement." 
    };
  }
}

// Générer un ID de commande unique
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `CMD-${timestamp}-${random}`;
}

// Afficher le résultat NatCash
function showNatcashResult(message, type) {
  const resultDiv = document.getElementById("natcashResult");
  if (!resultDiv) return;
  
  resultDiv.innerHTML = `
    <div style="padding: 1rem; border-radius: 0.5rem; background: ${type === 'success' ? '#dcfce7' : '#fee2e2'}; 
                color: ${type === 'success' ? '#166534' : '#991b1b'}; border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      ${message}
    </div>
  `;
}

// Afficher la confirmation de commande
function showOrderConfirmation(orderData) {
  const modal = document.getElementById("orderConfirmationModal");
  if (!modal) return;
  
  document.getElementById("orderIdDisplay").textContent = orderData.orderId;
  document.getElementById("orderAmountDisplay").textContent = orderData.amount.toFixed(2);
  document.getElementById("orderDateDisplay").textContent = new Date().toLocaleString();
  document.getElementById("orderConfirmationText").textContent = 
    `Merci ${orderData.customerName} ! Votre commande de ${orderData.totalItems} article(s) a été confirmée.`;
  
  modal.style.display = 'flex';
  
  // Ajouter l'overlay
  const overlay = document.getElementById("overlay");
  if (overlay) overlay.classList.add("active");
}

// Fermer la confirmation de commande
function closeOrderConfirmation() {
  const modal = document.getElementById("orderConfirmationModal");
  const overlay = document.getElementById("overlay");
  
  if (modal) modal.style.display = 'none';
  if (overlay) overlay.classList.remove("active");
}

// Fonction simulée d'envoi d'email
async function sendOrderConfirmationEmail(orderData, orderId) {
  // Dans une application réelle, vous utiliseriez un service d'email
  console.log("=== EMAIL DE CONFIRMATION ENVOYÉ ===");
  console.log("À: ", orderData.customerEmail || "Non spécifié");
  console.log("Sujet: Confirmation de votre commande MarcShop");
  console.log("Contenu:");
  console.log(`Bonjour ${orderData.customerName},`);
  console.log("Merci pour votre commande ! Voici le récapitulatif :");
  console.log("Numéro de commande: ", orderId);
  console.log("Articles:");
  orderData.products.forEach(item => {
    console.log(`- ${item.quantity}x ${item.name} (${item.size || 'N/A'}, ${item.color || 'N/A'}) - $${item.price.toFixed(2)}`);
  });
  console.log("Total: $", orderData.amount.toFixed(2));
  console.log("Méthode de paiement: NatCash");
  console.log("ID Transfert NatCash: ", orderData.natcashTransferId || "Non fourni");
  console.log("Numéro NatCash: ", orderData.natcashPhone || "Non fourni");
  console.log("================================");
  
  return true;
}

function filterByCategory(category) {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  const activeBtn = document.querySelector(`[data-category="${category}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
  applyFilters();
}

function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("overlay");
  if (sidebar) sidebar.classList.toggle("active");
  if (overlay) overlay.classList.toggle("active");
}

function closeAllPanels() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("overlay");
  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  closeLightbox();
  closeNatcashModal();
  
  // Fermer également la confirmation de commande
  const orderConfirmation = document.getElementById("orderConfirmationModal");
  if (orderConfirmation) orderConfirmation.style.display = 'none';
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
  const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
  const tabContent = document.getElementById(`${tabName}Tab`);
  if (tabBtn) tabBtn.classList.add("active");
  if (tabContent) tabContent.classList.add("active");
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

// Rendre les fonctions globales accessibles
window.closeOrderConfirmation = closeOrderConfirmation;
window.openProductOptions = openProductOptions;
