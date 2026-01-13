import { 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy,
    where,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const db = window.firebaseDB;
const auth = window.firebaseAuth;

// UID et email du propriétaire autorisé
const OWNER_EMAIL = 'emmanuelmarc130493@gmail.com';
const OWNER_PASSWORD = 'Marc1993@@';

let products = [];
let users = [];
let orders = [];
let carts = [];

// Références aux écouteurs en temps réel
let productsUnsubscribe = null;
let usersUnsubscribe = null;
let ordersUnsubscribe = null;
let cartsUnsubscribe = null;

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    checkOwnerSession();
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

function checkOwnerSession() {
    const ownerSession = localStorage.getItem("marcshop-owner-session");
    if (ownerSession) {
        const sessionData = JSON.parse(ownerSession);
        const now = new Date().getTime();
        if (now - sessionData.timestamp < 24 * 60 * 60 * 1000) {
            // Vérifier si le propriétaire est déjà connecté à Firebase
            onAuthStateChanged(auth, (user) => {
                if (user && user.email === OWNER_EMAIL) {
                    showDashboard();
                    setupRealtimeListeners();
                } else {
                    showLogin();
                }
            });
            return;
        }
    }
    showLogin();
}

function setupRealtimeListeners() {
    // Écouter les produits en temps réel
    productsUnsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
        products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderProductsList();
        updateStats();
    }, (error) => {
        console.error("Erreur lors de l'écoute des produits:", error);
        showAlert("Erreur lors du chargement des produits: " + error.message, "error");
    });

    // Écouter les utilisateurs en temps réel
    usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderUsersList();
        updateStats();
    }, (error) => {
        console.error("Erreur lors de l'écoute des utilisateurs:", error);
        showAlert("Erreur lors du chargement des utilisateurs: " + error.message, "error");
    });

    // Écouter les commandes en temps réel, triées par date décroissante
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderOrdersList();
        updateStats();
    }, (error) => {
        console.error("Erreur lors de l'écoute des commandes:", error);
        showAlert("Erreur lors du chargement des commandes: " + error.message, "error");
    });

    // Écouter les paniers en temps réel
    cartsUnsubscribe = onSnapshot(collection(db, "carts"), (snapshot) => {
        carts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderCartsList();
        updateStats();
    }, (error) => {
        console.error("Erreur lors de l'écoute des paniers:", error);
        showAlert("Erreur lors du chargement des paniers: " + error.message, "error");
    });
}

function login() {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Vérifier si l'utilisateur est le propriétaire
            if (user.email === OWNER_EMAIL) {
                localStorage.setItem("marcshop-owner-session", JSON.stringify({
                    timestamp: new Date().getTime(),
                    isOwner: true,
                }));
                showDashboard();
                setupRealtimeListeners();
            } else {
                showAlert("Accès refusé : vous n'êtes pas le propriétaire du site.", "error");
                signOut(auth);
            }
        })
        .catch((error) => {
            showAlert("Erreur de connexion: " + error.message, "error");
            document.getElementById("adminPassword").value = "";
        });
}

function logout() {
    // Arrêter tous les écouteurs en temps réel
    if (productsUnsubscribe) productsUnsubscribe();
    if (usersUnsubscribe) usersUnsubscribe();
    if (ordersUnsubscribe) ordersUnsubscribe();
    if (cartsUnsubscribe) cartsUnsubscribe();
    
    signOut(auth).then(() => {
        localStorage.removeItem("marcshop-owner-session");
        showLogin();
    }).catch((error) => {
        console.error("Erreur lors de la déconnexion:", error);
        showAlert("Erreur lors de la déconnexion: " + error.message, "error");
    });
}

function showAlert(message, type) {
    const alertDiv = document.getElementById("loginAlert");
    alertDiv.textContent = message;
    alertDiv.className = `alert alert-${type}`;
    alertDiv.style.display = "block";
    
    setTimeout(() => {
        alertDiv.style.display = "none";
    }, 5000);
}

function showLogin() {
    document.getElementById("adminLogin").style.display = "flex";
    document.getElementById("adminDashboard").style.display = "none";
}

function showDashboard() {
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminDashboard").style.display = "block";
    updateStats();
}

window.showSection = function(sectionName) {
    document.querySelectorAll(".sidebar-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".admin-section").forEach((section) => section.classList.remove("active"));
    event.target.classList.add("active");
    document.getElementById(sectionName + "Section").classList.add("active");
    if (sectionName === "dashboard") updateStats();
    if (sectionName === "products") renderProductsList();
    if (sectionName === "users") renderUsersList();
    if (sectionName === "orders") renderOrdersList();
    if (sectionName === "carts") renderCartsList();
}

async function addProduct() {
    const name = document.getElementById("productName").value;
    const price = Number.parseFloat(document.getElementById("productPrice").value);
    const originalPrice = Number.parseFloat(document.getElementById("productOriginalPrice").value);
    const category = document.getElementById("productCategory").value;
    const description = document.getElementById("productDescription").value;
    const images = [
        document.getElementById("productImage1").value,
        document.getElementById("productImage2").value,
        document.getElementById("productImage3").value,
        document.getElementById("productImage4").value,
    ].filter((img) => img.trim() !== "");
    
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
        showAlert("Produit ajouté avec succès!", "success");
    } catch (e) {
        showAlert("Erreur lors de l'ajout: " + e.message, "error");
    }
}

window.deleteProduct = async function(id) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit?")) {
        try {
            await deleteDoc(doc(db, "products", id));
            showAlert("Produit supprimé avec succès!", "success");
        } catch (e) {
            showAlert("Erreur lors de la suppression: " + e.message, "error");
        }
    }
};

function renderProductsList() {
    const productsList = document.getElementById("productsList");
    if (!products || products.length === 0) {
        productsList.innerHTML = "<p>Aucun produit ajouté.</p>";
        return;
    }
    
    const sortedProducts = [...products].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    productsList.innerHTML = `
        <h3>Produits existants (${sortedProducts.length})</h3>
        <div style="display: grid; gap: 1rem;">
            ${sortedProducts
                .map(
                    (product) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${product.images[0] || 'https://via.placeholder.com/60x60?text=Image+Manquante'}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.375rem;">
                            <div>
                                <strong>${product.name}</strong><br>
                                <span style="color: #10b981; font-weight: bold;">$${product.price.toFixed(2)}</span>
                                <span style="color: #6b7280; text-decoration: line-through; margin-left: 0.5rem;">$${product.originalPrice.toFixed(2)}</span><br>
                                <span style="color: #6b7280; font-size: 0.875rem;">${product.category}</span>
                            </div>
                        </div>
                        <button onclick="deleteProduct('${product.id}')" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                `
                )
                .join("")}
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
            ${users
                .map((user) => {
                    const isActive = isUserActive(user);
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; background: white;">
                            <div>
                                <strong>${user.name || 'Nom non défini'}</strong><br>
                                <span style="color: #6b7280;">${user.email || 'Email non défini'}</span><br>
                                <small>Inscrit le: ${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Date inconnue'}</small>
                            </div>
                            <div style="text-align: right;">
                                <span style="background: ${isActive ? "#10b981" : "#6b7280"}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">
                                    ${isActive ? "Actif" : "Inactif"}
                                </span>
                            </div>
                        </div>
                    `;
                })
                .join("")}
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
            ${orders
                .map((order) => {
                    const orderDate = order.createdAt || order.orderDate;
                    return `
                        <div class="order-item">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <strong>Commande #${order.id ? order.id.substring(0, 8) : 'N/A'}</strong>
                                <span style="color: #10b981; font-weight: bold;">$${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}</span>
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Client:</strong> ${order.customerName || 'Non spécifié'} (${order.customerEmail || 'Non spécifié'})<br>
                                <strong>Téléphone:</strong> ${order.customerPhone || 'Non spécifié'}<br>
                                <strong>Adresse:</strong> ${order.shippingAddress || 'Non spécifiée'}
                            </div>
                            <div>
                                <strong>Produits:</strong>
                                <ul style="margin-top: 0.5rem;">
                                    ${order.items ? order.items.map(item => `
                                        <li>${item.quantity}x ${item.name} (${item.size || 'Taille NS'}, ${item.color || 'Couleur NS'}) - $${item.price ? item.price.toFixed(2) : '0.00'}</li>
                                    `).join('') : 'Aucun détail produit'}
                                </ul>
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                                Passée le: ${orderDate ? new Date(orderDate).toLocaleDateString() : 'Date inconnue'} 
                                ${orderDate ? 'à ' + new Date(orderDate).toLocaleTimeString() : ''}
                            </div>
                        </div>
                    `;
                })
                .join("")}
        </div>
    `;
}

function renderCartsList() {
    const cartsList = document.getElementById("cartsList");
    if (!carts || carts.length === 0) {
        cartsList.innerHTML = "<p>Aucun panier actif.</p>";
        return;
    }
    
    // Filtrer les paniers qui ne sont pas vides
    const activeCarts = carts.filter(cart => cart.items && cart.items.length > 0);
    
    cartsList.innerHTML = `
        <h3>Paniers actifs (${activeCarts.length})</h3>
        <div style="display: grid; gap: 1rem;">
            ${activeCarts
                .map((cart) => {
                    const user = users.find(u => u.id === cart.userId);
                    const userName = user ? user.name : 'Utilisateur inconnu';
                    const userEmail = user ? user.email : 'Email inconnu';
                    const lastUpdated = cart.lastUpdated ? new Date(cart.lastUpdated) : new Date();
                    
                    return `
                        <div class="cart-item-admin">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <strong>${userName}</strong>
                                <span style="color: #10b981; font-weight: bold;">$${cart.totalAmount ? cart.totalAmount.toFixed(2) : '0.00'}</span>
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <strong>Email:</strong> ${userEmail}<br>
                                <strong>Articles:</strong> ${cart.items ? cart.items.length : 0}
                            </div>
                            <div>
                                <strong>Produits:</strong>
                                <ul style="margin-top: 0.5rem;">
                                    ${cart.items ? cart.items.map(item => `
                                        <li>${item.quantity}x ${item.name} (${item.size || 'Taille NS'}, ${item.color || 'Couleur NS'}) - $${item.price ? item.price.toFixed(2) : '0.00'}</li>
                                    `).join('') : 'Aucun article'}
                                </ul>
                            </div>
                            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                                Dernière mise à jour: ${lastUpdated.toLocaleDateString()} à ${lastUpdated.toLocaleTimeString()}
                            </div>
                        </div>
                    `;
                })
                .join("")}
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

function updateStats() {
    document.getElementById("totalProducts").textContent = products.length;
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("activeUsers").textContent = users.filter(isUserActive).length;
    
    // Compter les paniers actifs (non vides)
    const activeCartsCount = carts.filter(cart => cart.items && cart.items.length > 0).length;
    document.getElementById("activeCarts").textContent = activeCartsCount;
}
