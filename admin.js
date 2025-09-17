// Import des fonctions Firebase
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Initialisation Firebase
const db = window.firebaseDB;
const auth = window.firebaseAuth;

let products = [];
let users = [];
let orders = [];
let isLoggedIn = false;

// Email et mot de passe administrateur
const ADMIN_EMAIL = "admin@marcshop.com";
const ADMIN_PASSWORD = "admin123";

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkAdminSession();
});

function setupEventListeners() {
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });
  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addProduct();
  });
}

function checkAdminSession() {
  const adminSession = localStorage.getItem("marcshop-admin-session");
  if (adminSession) {
    const sessionData = JSON.parse(adminSession);
    const now = new Date().getTime();
    if (now - sessionData.timestamp < 24 * 60 * 60 * 1000) {
      showDashboard();
      loadData();
      return;
    }
  }
  showLogin();
}

async function login() {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    try {
      // Connexion à Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      
      localStorage.setItem("marcshop-admin-session", JSON.stringify({
        timestamp: new Date().getTime(),
        isAdmin: true,
      }));
      
      showDashboard();
      loadData();
    } catch (error) {
      console.error("Erreur de connexion:", error);
      alert("Erreur de connexion. Vérifiez vos identifiants.");
    }
  } else {
    alert("Identifiants administrateur incorrects!");
  }
}

function logout() {
  signOut(auth).then(() => {
    localStorage.removeItem("marcshop-admin-session");
    showLogin();
  }).catch((error) => {
    console.error("Erreur de déconnexion:", error);
  });
}

function showLogin() {
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
  isLoggedIn = false;
}

function showDashboard() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";
  isLoggedIn = true;
}

function loadData() {
  listenProducts();
  listenUsers();
  listenOrders();
}

function listenProducts() {
  const productsCol = collection(db, "products");
  const q = query(productsCol, orderBy("createdAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderProductsList();
    updateStats();
  });
}

function listenUsers() {
  const usersCol = collection(db, "users");
  const q = query(usersCol, orderBy("registeredAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderUsersList();
    updateStats();
  });
}

function listenOrders() {
  const ordersCol = collection(db, "orders");
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderOrdersList();
    updateStats();
  });
}

async function addProduct() {
  const name = document.getElementById("productName").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const originalPrice = parseFloat(document.getElementById("productOriginalPrice").value) || price;
  const category = document.getElementById("productCategory").value;
  const description = document.getElementById("productDescription").value;
  const image = document.getElementById("productImage").value;
  
  const newProduct = {
    name, 
    price, 
    originalPrice, 
    category, 
    description,
    images: [image],
    stock: 100,
    status: "active",
    createdAt: serverTimestamp()
  };
  
  try {
    await addDoc(collection(db, "products"), newProduct);
    document.getElementById("productForm").reset();
    alert("Produit ajouté avec succès!");
  } catch (e) {
    console.error("Erreur lors de l'ajout:", e);
    alert("Erreur lors de l'ajout du produit.");
  }
}

async function deleteProduct(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) {
    try {
      await deleteDoc(doc(db, "products", id));
      alert("Produit supprimé avec succès!");
    } catch (e) {
      console.error("Erreur lors de la suppression:", e);
      alert("Erreur lors de la suppression du produit.");
    }
  }
}

function renderProductsList() {
  const productsList = document.getElementById("productsList");
  if (!products || products.length === 0) {
    productsList.innerHTML = "<p>Aucun produit ajouté.</p>";
    return;
  }
  
  productsList.innerHTML = `
    <h3>Produits existants (${products.length})</h3>
    <div style="display: grid; gap: 1rem;">
      ${products.map(product => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${product.images[0] || 'https://via.placeholder.com/60x60?text=Image+Manquante'}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.375rem;">
            <div>
              <strong>${product.name}</strong><br>
              <span style="color: #10b981; font-weight: bold;">$${product.price.toFixed(2)}</span>
              ${product.originalPrice > product.price ? `<span style="color: #6b7280; text-decoration: line-through; margin-left: 0.5rem;">$${product.originalPrice.toFixed(2)}</span>` : ''}<br>
              <span style="color: #6b7280; font-size: 0.875rem;">${product.category}</span>
            </div>
          </div>
          <button onclick="deleteProduct('${product.id}')" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">
            <i class="fas fa-trash"></i> Supprimer
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderUsersList() {
  const usersList = document.getElementById("usersList");
  if (!users || users.length === 0) {
    usersList.innerHTML = "<p>Aucun utilisateur inscrit.</p>";
    return;
  }
  
  usersList.innerHTML = `
    <h3>Utilisateurs inscrits (${users.length})</h3>
    <div style="display: grid; gap: 1rem;">
      ${users.map(user => {
        const isActive = isUserActive(user);
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
            <div>
              <strong>${user.name}</strong><br>
              <span style="color: #6b7280;">${user.email}</span><br>
              <small>Inscrit le: ${new Date(user.registeredAt?.toDate() || user.registeredAt).toLocaleDateString()}</small>
            </div>
            <div style="text-align: right;">
              <span style="background: ${isActive ? "#10b981" : "#6b7280"}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                ${isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOrdersList() {
  const ordersList = document.getElementById("ordersList");
  if (!orders || orders.length === 0) {
    ordersList.innerHTML = "<p>Aucune commande passée.</p>";
    return;
  }
  
  ordersList.innerHTML = `
    <h3>Commandes (${orders.length})</h3>
    <div style="display: grid; gap: 1rem;">
      ${orders.map(order => {
        const orderDate = order.createdAt?.toDate() || order.createdAt;
        return `
          <div class="order-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <strong>Commande #${order.id.substring(0, 8)}</strong>
              <span style="color: #10b981; font-weight: bold;">$${order.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div style="margin-bottom: 0.5rem;">
              <strong>Client:</strong> ${order.customerName} (${order.customerEmail})<br>
              <strong>Téléphone:</strong> ${order.customerPhone}<br>
              <strong>Adresse:</strong> ${order.shippingAddress || 'Non spécifiée'}
            </div>
            <div>
              <strong>Statut:</strong> ${order.status || 'En traitement'}<br>
              <strong>Méthode de paiement:</strong> ${order.paymentMethod || 'Non spécifiée'}
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
              Passée le: ${new Date(orderDate).toLocaleDateString()}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function isUserActive(user) {
  if (!user.lastActivity) return false;
  const lastActivity = new Date(user.lastActivity?.toDate() || user.lastActivity);
  const now = new Date();
  const diffHours = (now - lastActivity) / (1000 * 60 * 60);
  return diffHours < 24;
}

function updateStats() {
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalUsers").textContent = users.length;
  document.getElementById("activeUsers").textContent = users.filter(isUserActive).length;
  document.getElementById("totalOrders").textContent = orders.length;
}

function showSection(sectionName) {
  document.querySelectorAll(".sidebar-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".admin-section").forEach((section) => section.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById(sectionName + "Section").classList.add("active");
}

// Exposer les fonctions globales
window.showSection = showSection;
window.deleteProduct = deleteProduct;
