// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLUZl0j_gO7aZtT2zwgTISWO5ab9AFfE0",
  authDomain: "marchat-b23f1.firebaseapp.com",
  projectId: "marchat-b23f1",
  storageBucket: "marchat-b23f1.appspot.com",
  messagingSenderId: "264746644024",
  appId: "1:264746644024:web:d575bac7eb65c3d3062ccd"
};

// Initialisation Firebase
try {
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth(app);
  const db = firebase.firestore(app);
  console.log("Firebase initialisé avec succès");
} catch (error) {
  console.error("Erreur d'initialisation Firebase:", error);
}

// Variables globales
let confirmationResult = null;
let recaptchaVerifier = null;
const countries = [
  { name: "République Dominicaine", code: "+1" },
  { name: "France", code: "+33" },
  { name: "Côte d'Ivoire", code: "+225" }
];

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});

function initApp() {
  // Mode test pour le développement
  if (window.location.hostname === "localhost") {
    firebase.auth().settings.appVerificationDisabledForTesting = true;
  }

  setupRecaptcha();
  populateCountryList();
  setupEventListeners();
  checkAuthState();
}

function setupRecaptcha() {
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    size: 'invisible',
    callback: (response) => {
      console.log("reCAPTCHA résolu", response);
    },
    'expired-callback': () => {
      showError("reCAPTCHA expiré, veuillez réessayer");
    }
  });
}

function populateCountryList() {
  const countryCodeSelect = document.getElementById('country-code');
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country.code;
    option.textContent = `${country.name} (${country.code})`;
    countryCodeSelect.appendChild(option);
  });
}

function setupEventListeners() {
  // Bouton Suivant
  document.getElementById('send-otp').addEventListener('click', sendOtp);
  
  // Gestion OTP
  document.querySelectorAll('.otp-digit').forEach(digit => {
    digit.addEventListener('input', handleOtpInput);
    digit.addEventListener('keydown', handleOtpBackspace);
  });
  
  document.getElementById('verify-otp').addEventListener('click', verifyOtp);
  document.getElementById('resend-otp').addEventListener('click', resendOtp);
  
  // Chat
  document.getElementById('send-message').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    firebase.auth().signOut();
  });
}

async function sendOtp() {
  const phoneNumber = "+1" + document.getElementById('phone').value.trim();
  console.log("Tentative d'envoi à:", phoneNumber);

  try {
    toggleLoading(true, document.getElementById('send-otp'));
    
    await new Promise(resolve => {
      if (grecaptcha.getResponse()) resolve();
      grecaptcha.ready(resolve);
    });

    confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
    
    document.getElementById('user-phone-display').textContent = phoneNumber;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('otp-screen').classList.remove('hidden');
    document.querySelector('.otp-digit').focus();
    
  } catch (error) {
    console.error("Erreur Firebase:", error.code, error.message);
    handleAuthError(error);
  } finally {
    toggleLoading(false, document.getElementById('send-otp'));
  }
}

function handleAuthError(error) {
  const errorMessages = {
    'auth/invalid-phone-number': 'Numéro invalide. Format: +18093978951',
    'auth/missing-phone-number': 'Veuillez entrer un numéro',
    'auth/quota-exceeded': 'Limite de SMS atteinte',
    'auth/captcha-check-failed': 'Erreur de vérification reCAPTCHA'
  };
  
  showError(errorMessages[error.code] || "Erreur lors de l'envoi du SMS");
}

async function verifyOtp() {
  const otpCode = Array.from(document.querySelectorAll('.otp-digit'))
    .map(d => d.value).join('');

  if (otpCode.length !== 6) {
    showError("Veuillez entrer un code complet à 6 chiffres");
    return;
  }

  try {
    toggleLoading(true, document.getElementById('verify-otp'));
    await confirmationResult.confirm(otpCode);
  } catch (error) {
    console.error("Erreur:", error);
    showError("Code incorrect. Veuillez réessayer.");
  } finally {
    toggleLoading(false, document.getElementById('verify-otp'));
  }
}

async function resendOtp(e) {
  e.preventDefault();
  await sendOtp();
  showError("Un nouveau code a été envoyé");
}

function checkAuthState() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Utilisateur connecté
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('otp-screen').classList.add('hidden');
      document.getElementById('chat-screen').classList.remove('hidden');
      initChat(user);
    } else {
      // Utilisateur non connecté
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('otp-screen').classList.add('hidden');
      document.getElementById('chat-screen').classList.add('hidden');
    }
  });
}

function initChat(user) {
  const phoneLastDigits = user.phoneNumber.slice(-2);
  document.getElementById('user-avatar').textContent = phoneLastDigits;
  
  db.collection("messages")
    .orderBy("timestamp")
    .onSnapshot((snapshot) => {
      const chatContainer = document.getElementById('chat-container');
      chatContainer.innerHTML = '';
      snapshot.forEach((doc) => {
        displayMessage(doc.data());
      });
      scrollToBottom();
    });
}

async function sendMessage() {
  const messageInput = document.getElementById('message-input');
  const text = messageInput.value.trim();
  
  if (!text || !firebase.auth().currentUser) return;

  try {
    await db.collection("messages").add({
      text: text,
      senderId: firebase.auth().currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    messageInput.value = '';
  } catch (error) {
    console.error("Erreur:", error);
    showError("Erreur lors de l'envoi du message");
  }
}

// Fonctions utilitaires
function toggleLoading(isLoading, button) {
  button.disabled = isLoading;
  const spinner = button.querySelector('i');
  const text = button.querySelector('span');
  
  spinner.classList.toggle('hidden', !isLoading);
  text.classList.toggle('hidden', isLoading);
}

function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  setTimeout(() => errorElement.textContent = '', 5000);
}

function handleOtpInput(e) {
  const digit = e.target;
  const index = parseInt(digit.dataset.index);
  
  if (digit.value.length === 1 && index < 5) {
    document.querySelector(`.otp-digit[data-index="${index + 1}"]`).focus();
  }
}

function handleOtpBackspace(e) {
  if (e.key === 'Backspace') {
    const digit = e.target;
    const index = parseInt(digit.dataset.index);
    
    if (digit.value === '' && index > 0) {
      document.querySelector(`.otp-digit[data-index="${index - 1}"]`).focus();
    }
  }
}

function displayMessage(message) {
  const messageDiv = document.createElement('div');
  const isCurrentUser = message.senderId === firebase.auth().currentUser.uid;
  
  messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
  messageDiv.innerHTML = `
    <div class="message-text">${message.text}</div>
    <div class="message-time">${formatTime(message.timestamp?.toDate())}</div>
  `;
  
  document.getElementById('chat-container').appendChild(messageDiv);
}

function formatTime(date) {
  return date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';
}

function scrollToBottom() {
  const container = document.getElementById('chat-container');
  container.scrollTop = container.scrollHeight;
}
