import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase (à remplacer par la vôtre)
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
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
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("productForm").addEventListener("submit", addProduct);
}

// Authentification admin
function checkAdminSession() {
  const adminSession = localStorage.getItem("marcshop-admin-session");
  if (adminSession) {
    showDashboard();
  } else {
    showLogin();
  }
}

function login(e) {
  e.preventDefault();
  const password = document.getElementById("adminPassword").value;

  if (password === "marcshop2024") {
    const sessionData = { timestamp: Date.now() };
    localStorage.setItem("marcshop-admin-session", JSON.stringify(sessionData));
    showDashboard();
  } else {
    alert("Mot de passe incorrect!");
  }
}

function logout() {
  localStorage.removeItem("marcshop-admin-session");
  showLogin();
}

// Gestion des produits
async function addProduct(e) {
  e.preventDefault();
  
  const productData = {
    name: document.getElementById("productName").value,
    price: parseFloat(document.getElementById("productPrice").value),
    originalPrice: parseFloat(document.getElementById("productOriginalPrice").value),
    category: document.getElementById("productCategory").value,
    description: document.getElementById("productDescription").value,
    images: [
      document.getElementById("productImage1").value,
      document.getElementById("productImage2").value,
      document.getElementById("productImage3").value,
      document.getElementById("productImage4").value
    ].filter(url => url.trim() !== ""),
    createdAt: new Date().toISOString(),
    status: "active"
  };

  try {
    // Ajouter à Firebase
    await addDoc(collection(db, "products"), productData);
    alert("Produit ajouté avec succès!");
    document.getElementById("productForm").reset();
    renderProductsList();
  } catch (error) {
    console.error("Erreur d'ajout:", error);
    alert("Erreur lors de l'ajout du produit");
  }
}

async function deleteProduct(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) {
    try {
      await deleteDoc(doc(db, "products", id));
      renderProductsList();
    } catch (error) {
      console.error("Erreur de suppression:", error);
    }
  }
}

// Affichage des produits
async function renderProductsList() {
  const productsList = document.getElementById("productsList");
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
  document.querySelectorAll(".admin-section").forEach(section => {
    section.classList.remove("active");
  });
  document.getElementById(`${sectionName}Section`).classList.add("active");
  if (sectionName === "products") renderProductsList();
}

function showLogin() {
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
}

function showDashboard() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";
  renderProductsList();
}

// Exposer les fonctions globales
window.showSection = showSection;
window.logout = logout;
window.deleteProduct = deleteProduct;
