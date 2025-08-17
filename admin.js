// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBLUZl0j_gO7aZtT2zwgTISWO5ab9AFfE0",
    authDomain: "marchat-b23f1.firebaseapp.com",
    projectId: "marchat-b23f1",
    storageBucket: "marchat-b23f1.firebasestorage.app",
    messagingSenderId: "264746644024",
    appId: "1:264746644024:web:d575bac7eb65c3d3062ccd",
    measurementId: "G-Y9Q0XWH80H"
};

// Initialiser Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);
const productsRef = db.collection("products");
const usersRef = db.collection("users");

// Configuration admin
const ADMIN_PASSWORD = "marcshop2024";

// État global
let products = [];
let users = [];
let isLoggedIn = false;

// Initialisation
document.addEventListener("DOMContentLoaded", async () => {
    setupEventListeners();
    checkAdminSession();
});

// Chargement des données depuis Firebase
async function loadData() {
    try {
        // Charger les produits
        const productsSnapshot = await productsRef.get();
        products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt || new Date().toISOString()
        }));
        
        // Charger les utilisateurs
        const usersSnapshot = await usersRef.get();
        users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
    } catch (e) {
        console.error("Erreur de chargement des données:", e);
        products = [];
        users = [];
    }
}

// Configuration des événements
function setupEventListeners() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            login();
        });
    }

    const productForm = document.getElementById("productForm");
    if (productForm) {
        productForm.addEventListener("submit", (e) => {
            e.preventDefault();
            addProduct();
        });
    }
}

// Authentification admin
function checkAdminSession() {
    const adminSession = localStorage.getItem("marcshop-admin-session");
    if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        const now = new Date().getTime();

        // Session valide pendant 24h
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
        // Créer une session admin
        const sessionData = {
            timestamp: new Date().getTime(),
            isAdmin: true,
        };
        localStorage.setItem("marcshop-admin-session", JSON.stringify(sessionData));

        showDashboard();
    } else {
        alert("Mot de passe incorrect!");
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
    isLoggedIn = false;
}

function showDashboard() {
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminDashboard").style.display = "block";
    isLoggedIn = true;

    // Charger les données après la connexion
    loadData().then(() => {
        updateStats();
        renderProductsList();
        renderUsersList();
    });
}

// Navigation admin
function showSection(sectionName) {
    document.querySelectorAll(".sidebar-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".admin-section").forEach((section) => section.classList.remove("active"));

    // Trouver le bouton actif
    const activeBtn = document.querySelector(`.sidebar-btn[onclick*="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add("active");
    }
    
    // Afficher la section
    const section = document.getElementById(sectionName + "Section");
    if (section) {
        section.classList.add("active");
    }

    // Actualiser les données selon la section
    if (sectionName === "dashboard") updateStats();
    if (sectionName === "products") renderProductsList();
    if (sectionName === "users") renderUsersList();
}

// CORRECTION DU FORMAT DES NOMBRES - FONCTION ADD PRODUCT
async function addProduct() {
    // Récupérer les valeurs du formulaire
    const name = document.getElementById("productName").value;
    
    // CORRECTION: Gérer les virgules dans les nombres
    const priceValue = document.getElementById("productPrice").value.replace(',', '.');
    const originalPriceValue = document.getElementById("productOriginalPrice").value.replace(',', '.');
    
    const price = parseFloat(priceValue);
    const originalPrice = parseFloat(originalPriceValue);
    
    const category = document.getElementById("productCategory").value;
    const description = document.getElementById("productDescription").value;

    // Validation des champs obligatoires
    if (!name || isNaN(price) || isNaN(originalPrice) || !category) {
        alert("Veuillez remplir tous les champs obligatoires (*)");
        return;
    }

    // Récupérer les images
    const images = [
        document.getElementById("productImage1").value,
        document.getElementById("productImage2").value,
        document.getElementById("productImage3").value,
        document.getElementById("productImage4").value,
    ].filter((img) => img.trim() !== "");

    // Validation des images
    if (images.length === 0) {
        alert("Veuillez ajouter au moins une image");
        return;
    }

    // Créer l'objet produit
    const newProduct = {
        name: name,
        price: price,
        originalPrice: originalPrice,
        images: images,
        category: category,
        description: description,
        stock: 100,
        status: "active",
        createdAt: new Date().toISOString()
    };

    try {
        // Ajouter le produit à Firestore
        const docRef = await productsRef.add(newProduct);
        
        // Mettre à jour la liste locale avec le nouvel ID
        products.push({
            id: docRef.id,
            ...newProduct
        });
        
        // Mettre à jour l'interface
        renderProductsList();
        updateStats();
        
        // Réinitialiser le formulaire
        document.getElementById("productForm").reset();
        
        // Message de succès
        alert("Produit ajouté avec succès!");
    } catch (error) {
        console.error("Erreur lors de l'ajout du produit:", error);
        alert("Erreur lors de l'ajout du produit: " + error.message);
    }
}

async function deleteProduct(id) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) {
        try {
            // Supprimer le produit de Firestore
            await productsRef.doc(id).delete();
            
            // Mettre à jour la liste locale
            products = products.filter((p) => p.id !== id);
            
            renderProductsList();
            updateStats();
        } catch (error) {
            console.error("Erreur lors de la suppression du produit:", error);
            alert("Erreur lors de la suppression du produit");
        }
    }
}

// Affichage des produits
function renderProductsList() {
    const productsList = document.getElementById("productsList");

    if (products.length === 0) {
        productsList.innerHTML = "<p>Aucun produit ajouté.</p>";
        return;
    }

    // Trier les produits par date de création (récent en premier)
    const sortedProducts = [...products].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    productsList.innerHTML = `
        <h3>Produits existants (${sortedProducts.length})</h3>
        <div style="display: grid; gap: 1rem;">
            ${sortedProducts.map((product) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${product.images[0] || 'https://via.placeholder.com/60x60?text=Image+Manquante'}" 
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
            `).join("")}
        </div>
    `;
}

// Gestion des utilisateurs
function renderUsersList() {
    const usersList = document.getElementById("usersList");

    if (users.length === 0) {
        usersList.innerHTML = "<p>Aucun utilisateur inscrit.</p>";
        return;
    }

    usersList.innerHTML = `
        <h3>Utilisateurs inscrits (${users.length})</h3>
        <div style="display: grid; gap: 1rem;">
            ${users.map((user) => {
                const isActive = isUserActive(user);
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
                        <div>
                            <strong>${user.name}</strong><br>
                            <span style="color: #6b7280;">${user.email}</span><br>
                            <small>Inscrit le: ${new Date(user.registeredAt).toLocaleDateString()}</small>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${isActive ? "#10b981" : "#6b7280"}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                                ${isActive ? "Actif" : "Inactif"}
                            </span>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function isUserActive(user) {
    if (!user.lastActivity) return false;
    
    const lastActivity = new Date(user.lastActivity);
    const now = new Date();
    const diffHours = (now - lastActivity) / (1000 * 60 * 60);
    return diffHours < 24;
}

// Statistiques
function updateStats() {
    const totalProducts = products.length;
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => isUserActive(user)).length;

    document.getElementById("totalProducts").textContent = totalProducts;
    document.getElementById("totalUsers").textContent = totalUsers;
    document.getElementById("activeUsers").textContent = activeUsers;
}
