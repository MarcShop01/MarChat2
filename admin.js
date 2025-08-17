// Initialisation de l'administration
document.addEventListener("DOMContentLoaded", () => {
  // Vérifier si l'utilisateur est déjà connecté
  const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
  
  if (isLoggedIn) {
    showDashboard();
  } else {
    document.getElementById("adminLogin").style.display = "flex";
  }
  
  // Écouteur pour le formulaire de connexion
  document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const password = document.getElementById("adminPassword").value;
    
    // Vérification du mot de passe (remplacez par votre vrai mot de passe)
    if (password === "admin123") {
      localStorage.setItem("adminLoggedIn", "true");
      showDashboard();
    } else {
      alert("Mot de passe incorrect");
    }
  });
  
  // Écouteur pour le formulaire d'ajout de produit
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", function(e) {
      e.preventDefault();
      addProductAdmin();
    });
  }
  
  // Initialisation des sections
  showSection('dashboard');
});

function showDashboard() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";
  updateStats();
}

function logout() {
  localStorage.removeItem("adminLoggedIn");
  document.getElementById("adminDashboard").style.display = "none";
  document.getElementById("adminLogin").style.display = "flex";
  document.getElementById("adminPassword").value = "";
}

function showSection(sectionId) {
  // Masquer toutes les sections
  document.querySelectorAll(".admin-section").forEach(section => {
    section.style.display = "none";
  });
  
  // Désactiver tous les boutons
  document.querySelectorAll(".sidebar-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  
  // Afficher la section sélectionnée
  document.getElementById(`${sectionId}Section`).style.display = "block";
  
  // Activer le bouton correspondant
  const activeBtn = [...document.querySelectorAll(".sidebar-btn")].find(btn => 
    btn.getAttribute('onclick').includes(`'${sectionId}'`)
  );
  
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}

function updateStats() {
  // Charger les données depuis localStorage
  let products = JSON.parse(localStorage.getItem("marcshop-products")) || [];
  let users = JSON.parse(localStorage.getItem("marcshop-users")) || [];
  
  // Mettre à jour les statistiques
  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalUsers").textContent = users.length;
  
  // Calculer les utilisateurs actifs (simplifié)
  const activeUsers = users.filter(user => user.isActive).length;
  document.getElementById("activeUsers").textContent = activeUsers;
}

function addProductAdmin() {
  const name = document.getElementById("productName").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const originalPrice = parseFloat(document.getElementById("productOriginalPrice").value);
  const image1 = document.getElementById("productImage1").value;
  const image2 = document.getElementById("productImage2").value;
  const image3 = document.getElementById("productImage3").value;
  const image4 = document.getElementById("productImage4").value;
  const category = document.getElementById("productCategory").value;
  const description = document.getElementById("productDescription").value;

  if (!name || isNaN(price) || isNaN(originalPrice) || !image1 || !category) {
    alert("Veuillez remplir tous les champs obligatoires (*)");
    return;
  }

  const images = [image1];
  if (image2) images.push(image2);
  if (image3) images.push(image3);
  if (image4) images.push(image4);

  const newProduct = {
    id: Date.now(),
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

  // Charger les produits existants
  let products = JSON.parse(localStorage.getItem("marcshop-products")) || [];
  products.push(newProduct);
  localStorage.setItem("marcshop-products", JSON.stringify(products));
  
  // Réinitialiser le formulaire
  document.getElementById("productForm").reset();
  
  // Mettre à jour les statistiques
  updateStats();
  
  alert("Produit ajouté avec succès!");
}
