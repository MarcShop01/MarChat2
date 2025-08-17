import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Configuration Firebase CORRECTE
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

// Mot de passe admin
const ADMIN_PASSWORD = "marcshop2024";

// State
let products = [];

// Ecoute produits Firestore en direct
function listenProducts() {
  const productsCol = collection(db, "products");
  onSnapshot(productsCol, (snapshot) => {
    products = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    renderProductsList();
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
    name,
    price,
    originalPrice,
    images,
    category,
    description,
    stock: 100,
    status: "active",
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "products"), newProduct);
    document.getElementById("productForm").reset();
    alert("Produit ajouté avec succès !");
  } catch (e) {
    alert("Erreur lors de l'ajout : " + e.message);
    console.error(e);
  }
}

// Supprimer produit
window.deleteProduct = async function(id) {
  if (confirm("Supprimer ce produit ?")) {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      alert("Erreur suppression : " + e.message);
      console.error(e);
    }
  }
}

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
        <li style="margin-bottom:1rem; background:#f1f5f9; padding:1rem;">
          <strong>${product.name}</strong> - ${product.category}<br>
          <span style="color:#059669;">${product.price.toFixed(2)} €</span> 
          <span style="text-decoration:line-through; color:#64748b;">${product.originalPrice.toFixed(2)} €</span><br>
          <img src="${product.images[0]}" alt="${product.name}" style="max-width:80px; max-height:80px; border-radius:6px;">
          <button style="background:#ef4444; color:white; margin-left:1rem;" onclick="deleteProduct('${product.id}')">Supprimer</button>
        </li>
      `).join("")}
    </ul>
  `;
}

// Authentification admin
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
    const sessionData = { timestamp: new Date().getTime(), isAdmin: true };
    localStorage.setItem("marcshop-admin-session", JSON.stringify(sessionData));
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
  listenProducts();
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();

  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    login();
  });

  document.getElementById("logoutBtn").addEventListener("click", logout);

  document.getElementById("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addProduct();
  });
});
