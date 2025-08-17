import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLUZl0j_gO7aZtT2zwgTISWO5ab9AFfE0",
  authDomain: "marchat-b23f1.firebaseapp.com",
  projectId: "marchat-b23f1",
  storageBucket: "marchat-b23f1.firebasestorage.app",
  messagingSenderId: "264746644024",
  appId: "1:264746644024:web:d575bac7eb65c3d3062ccd"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// État global
let isLoggedIn = false;

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkAdminSession();
});

// Configuration des événements
function setupEventListeners() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", login);
  }
  
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", addProduct);
  }
}

// Authentification admin - CORRIGÉ
function checkAdminSession() {
  const adminSession = localStorage.getItem("marcshop-admin-session");
  if (adminSession) {
    const sessionData = JSON.parse(adminSession);
    const now = new Date().getTime();
    
    // Vérifier si la session est toujours valide (24h)
    if (now - sessionData.timestamp < 24 * 60 * 60 * 1000) {
      showDashboard();
      return;
    }
  }
  showLogin();
}

function login(e) {
  if (e) e.preventDefault();
  
  const passwordInput = document.getElementById("adminPassword");
  if (!passwordInput) return;
  
  const password = passwordInput.value;

  if (password === "marcshop2024") {
    const sessionData = { 
      timestamp: Date.now(),
      isAdmin: true
    };
    localStorage.setItem("marcshop-admin-session", JSON.stringify(sessionData));
    showDashboard();
  } else {
    alert("Mot de passe incorrect!");
    if (passwordInput) passwordInput.value = "";
  }
}

function logout() {
  localStorage.removeItem("marcshop-admin-session");
  showLogin();
}

// Gestion des produits
async function addProduct(e) {
  if (e) e.preventDefault();
  
  const productData = {
    name: document.getElementById("productName")?.value || "",
    price: parseFloat(document.getElementById("productPrice")?.value || 0),
    originalPrice: parseFloat(document.getElementById("productOriginalPrice")?.value || 0),
    category: document.getElementById("productCategory")?.value || "",
    description: document.getElementById("productDescription")?.value || "",
    images: [
      document.getElementById("productImage1")?.value || "",
      document.getElementById("productImage2")?.value || "",
      document.getElementById("productImage3")?.value || "",
      document.getElementById("productImage4")?.value || ""
    ].filter(url => url.trim() !== ""),
    createdAt: new Date().toISOString(),
    status: "active"
  };

  try {
    await addDoc(collection(db, "products"), productData);
    alert("Produit ajouté avec succès!");
    
    const form = document.getElementById("productForm");
    if (form) form.reset();
    
    renderProductsList();
  } catch (error) {
    console.error("Erreur d'ajout:", error);
    alert("Erreur lors de l'ajout du produit");
  }
}

async function deleteProduct(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) return;
  
  try {
    await deleteDoc(doc(db, "products", id));
    renderProductsList();
  } catch (error) {
    console.error("Erreur de suppression:", error);
    alert("Erreur lors de la suppression du produit");
  }
}

// Affichage des produits
async function renderProductsList() {
  const productsList = document.getElementById("productsList");
  if (!productsList) return;
  
  productsList.innerHTML = "<p>Chargement des produits...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const products = [];
    
    querySnapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length === 0) {
      productsList.innerHTML = "<p>Aucun produit ajouté.</p>";
      return;
    }

    // Trier par date de création (récent en premier)
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    productsList.innerHTML = `
      <h3>Produits existants (${products.length})</h3>
      <div style="display: grid; gap: 1rem;">
        ${products.map(product => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <img src="${product.images[0] || 'https://via.placeholder.com/60x60?text=Image'}" 
                   alt="${product.name}" 
                   style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.375rem;">
              <div>
                <strong>${product.name}</strong><br>
                <span style="color: #10b981; font-weight: bold;">$${product.price.toFixed(2)}</span>
                <span style="color: #6b7280; text-decoration: line-through; margin-left: 0.5rem;">
                  $${product.originalPrice.toFixed(2)}
                </span><br>
                <span style="color: #6b7280; font-size: 0.875rem;">${product.category}</span>
              </div>
            </div>
            <button onclick="deleteProduct('${product.id}')" 
                    style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">
              <i class="fas fa-trash"></i> Supprimer
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error("Erreur de chargement:", error);
    productsList.innerHTML = "<p>Erreur lors du chargement des produits</p>";
  }
}

// Navigation admin
function showSection(sectionName) {
  // Masquer toutes les sections
  document.querySelectorAll(".admin-section").forEach(section => {
    section.classList.remove("active");
  });
  
  // Afficher la section demandée
  const section = document.getElementById(`${sectionName}Section`);
  if (section) section.classList.add("active");
  
  // Charger les données si nécessaire
  if (sectionName === "products") renderProductsList();
}

function showLogin() {
  const loginSection = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");
  
  if (loginSection) loginSection.style.display = "flex";
  if (dashboard) dashboard.style.display = "none";
}

function showDashboard() {
  const loginSection = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");
  
  if (loginSection) loginSection.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
  
  renderProductsList();
  updateStats();
}

// Mettre à jour les statistiques
async function updateStats() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    const totalProducts = productsSnapshot.size;
    
    document.getElementById("totalProducts") && 
      (document.getElementById("totalProducts").textContent = totalProducts);
    
    // Les utilisateurs sont gérés localement dans cet exemple
    const users = JSON.parse(localStorage.getItem("marcshop-users") || "[]");
    const totalUsers = users.length;
    const activeUsers = users.filter(user => 
      new Date() - new Date(user.lastActivity) < 24 * 60 * 60 * 1000
    ).length;
    
    document.getElementById("totalUsers") && 
      (document.getElementById("totalUsers").textContent = totalUsers);
    
    document.getElementById("activeUsers") && 
      (document.getElementById("activeUsers").textContent = activeUsers);
      
  } catch (error) {
    console.error("Erreur de chargement des stats:", error);
  }
}

// Exposer les fonctions globales
window.showSection = showSection;
window.logout = logout;
window.deleteProduct = deleteProduct;
window.login = login;
