import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_krW6QcyTS6JZNJf-_7YAc_491mCWYaQ",
  authDomain: "marchat-e4d21.firebaseapp.com",
  projectId: "marchat-e4d21",
  storageBucket: "marchat-e4d21.appspot.com",
  messagingSenderId: "211043298263",
  appId: "1:211043298263:web:dcf751d299aa4360d83992",
  measurementId: "G-CZHXLDZTBW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_PASSWORD = "marcshop2024";
let products = [];
let users = [];
let orders = []; // Ajoute ici si tu utilises une collection "orders"

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkAdminSession();
  listenProducts();
  listenUsers();
  listenOrders();
});

function listenProducts() {
  onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderProductsList();
    updateStats();
  });
}
function listenUsers() {
  onSnapshot(collection(db, "users"), (snapshot) => {
    users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderUsersList();
    updateStats();
  });
}
function listenOrders() {
  // Si tu utilises une collection "orders" dans Firestore
  onSnapshot(collection(db, "orders"), (snapshot) => {
    orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderOrdersList();
    updateStats();
  });
}

// Authentification
function checkAdminSession() {
  const adminSession = localStorage.getItem("marcshop-admin-session");
  if (adminSession) {
    const sessionData = JSON.parse(adminSession);
    const now = new Date().getTime();
    if (now - sessionData.timestamp < 24 * 60 * 60 * 1000) {
      showDashboard();
      return;
    }
  }
  showLogin();
}
function login() {
  const password = document.getElementById("adminPassword").value;
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem("marcshop-admin-session", JSON.stringify({
      timestamp: new Date().getTime(),
      isAdmin: true,
    }));
    showDashboard();
  } else {
    alert("Mot de passe incorrect !");
    document.getElementById("adminPassword").value = "";
  }
}
function logout() {
  localStorage.removeItem("marcshop-admin-session");
  showLogin();
}
function showLogin() {
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
}
function showDashboard() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";
}
// Navigation
function setupEventListeners() {
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });
  document.getElementById("logoutBtn").addEventListener("click", logout);

  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.section + "Section").classList.add("active");
    });
  });

  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addProduct();
  });
}

// Ajout produit
async function addProduct() {
  const name = document.getElementById("productName").value.trim();
  const price = parseFloat(document.getElementById("productPrice").value);
  const originalPrice = parseFloat(document.getElementById("productOriginalPrice").value);
  const category = document.getElementById("productCategory").value;
  const description = document.getElementById("productDescription").value;
  const images = [
    document.getElementById("productImage1").value,
    document.getElementById("productImage2").value,
    document.getElementById("productImage3").value,
    document.getElementById("productImage4").value,
  ].filter(img => img.trim() !== "");

  if (!name || isNaN(price) || isNaN(originalPrice) || !category || images.length === 0) {
    alert("Tous les champs obligatoires (*) doivent être remplis et au moins une image !");
    return;
  }

  const newProduct = {
    name, price, originalPrice, category, description, images,
    stock: 100,
    status: "active",
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "products"), newProduct);
    document.getElementById("productForm").reset();
    alert("Produit ajouté !");
  } catch (e) {
    alert("Erreur lors de l'ajout : " + e.message);
  }
}

// Suppression produit
window.deleteProduct = async function(id) {
  if (confirm("Supprimer ce produit ?")) {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      alert("Erreur suppression : " + e.message);
    }
  }
};

// Affichage produits
function renderProductsList() {
  const productsList = document.getElementById("productsList");
  if (!products || products.length === 0) {
    productsList.innerHTML = "<p>Aucun produit ajouté.</p>";
    return;
  }
  productsList.innerHTML = `
    <ul>
      ${products.map(product => `
        <li>
          <img src="${product.images[0] || 'https://via.placeholder.com/80?text=Image'}" alt="${product.name}">
          <div>
            <strong>${product.name}</strong><br>
            <span style="color:#059669;">${product.price.toFixed(2)} €</span>
            <span style="text-decoration:line-through; color:#64748b;">${product.originalPrice.toFixed(2)} €</span>
            <br><small>${product.category}</small>
          </div>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Supprimer</button>
        </li>
      `).join("")}
    </ul>
  `;
}

// Affichage utilisateurs
function renderUsersList() {
  const usersList = document.getElementById("usersList");
  if (!users || users.length === 0) {
    usersList.innerHTML = "<p>Aucun utilisateur inscrit.</p>";
    return;
  }
  usersList.innerHTML = `
    <ul>
      ${users.map(user => `
        <li style="background:white; margin-bottom:1rem; border-radius:0.5rem; padding:1rem;">
          <strong>${user.name}</strong> <br>
          <span>${user.email}</span> <br>
          <small>Inscrit le : ${new Date(user.registeredAt).toLocaleDateString()}</small>
        </li>
      `).join("")}
    </ul>
  `;
}

// Affichage commandes (exemple)
function renderOrdersList() {
  const ordersList = document.getElementById("ordersList");
  if (!orders || orders.length === 0) {
    ordersList.innerHTML = "<p>Aucune commande à afficher pour le moment.</p>";
    return;
  }
  ordersList.innerHTML = `
    <ul>
      ${orders.map(order => `
        <li>
          <strong>Commande #${order.id}</strong><br>
          <span>Utilisateur : ${order.userName || "?"}</span><br>
          <span>Total : $${order.total ? order.total.toFixed(2) : "?"}</span><br>
          <small>Date : ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "?"}</small>
        </li>
      `).join("")}
    </ul>
  `;
}

// Stats dashboard
function updateStats() {
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalUsers").textContent = users.length;
  document.getElementById("totalOrders").textContent = orders.length;
}
