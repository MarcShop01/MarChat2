class MarChatApp {
  constructor() {
    // Configuration Twilio (remplacez par vos infos)
    this.TWILIO_API_URL = 'http://localhost:3000'; // Votre serveur Node.js
    this.isTesting = true; // Mettre à false en production

    // Données de l'application
    this.contacts = [];
    this.messages = {};
    this.currentUser = null;
    this.currentContact = null;
    this.otpCode = "";

    this.initAuthSystem();
    this.initEventListeners();
    this.checkAuthState();
  }

  initAuthSystem() {
    // Écouteurs d'authentification
    document.getElementById('send-otp').addEventListener('click', () => this.sendOtp());
    document.getElementById('verify-otp').addEventListener('click', () => this.verifyOtp());
    
    // Gestion des inputs OTP
    document.querySelectorAll('.otp-digit').forEach(digit => {
      digit.addEventListener('input', (e) => this.handleOtpInput(e));
      digit.addEventListener('keydown', (e) => this.handleOtpBackspace(e));
    });
  }

  initEventListeners() {
    // Navigation
    document.getElementById('back-to-contacts').addEventListener('click', () => this.showContactsScreen());
    
    // Chat
    document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  // ================= AUTHENTIFICATION =================
  async sendOtp() {
    const phone = this.getPhoneNumber();
    
    if (!this.validatePhone(phone)) {
      this.showError("Format invalide. Ex: +18093978951", 'auth');
      return;
    }

    try {
      if (this.isTesting) {
        // Mode test (sans Twilio)
        this.otpCode = this.generateOtp();
        alert(`CODE DE TEST : ${this.otpCode}\n\n(En production, ce code serait envoyé par SMS)`);
        this.showOtpScreen(phone);
      } else {
        // Mode production avec Twilio
        const response = await fetch(`${this.TWILIO_API_URL}/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });

        const data = await response.json();
        
        if (data.success) {
          this.otpCode = data.otp;
          this.showOtpScreen(phone);
        }
      }
    } catch (error) {
      this.showError("Erreur d'envoi du SMS", 'auth');
      console.error("Erreur:", error);
    }
  }

  verifyOtp() {
    const enteredOtp = this.getEnteredOtp();
    
    if (enteredOtp === this.otpCode) {
      this.currentUser = {
        phone: this.getPhoneNumber(),
        verified: true
      };
      this.showAuthSuccess();
      this.initContacts();
      this.showContactsScreen();
    } else {
      this.showError("Code incorrect. Veuillez réessayer.", 'otp');
    }
  }

  // ================= GESTION CONTACTS =================
  initContacts() {
    // Contacts par défaut (peuvent être chargés depuis une API)
    this.addContact("+18095551234", "Jean Dupont");
    this.addContact("+18095556789", "Marie Claire");
    
    // Ajoute l'utilisateur actuel comme contact (pour le démo)
    this.addContact(this.currentUser.phone, "Moi");
  }

  addContact(phoneNumber, name = "") {
    if (this.contacts.some(c => c.phone === phoneNumber)) return;

    const newContact = {
      id: this.contacts.length + 1,
      name: name || `Contact ${phoneNumber}`,
      phone: phoneNumber,
      lastSeen: "En ligne",
      avatar: name ? name.charAt(0) : phoneNumber.slice(-2)
    };
    
    this.contacts.push(newContact);
    this.messages[newContact.id] = [];
    return newContact;
  }

  loadContacts() {
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    
    this.contacts.forEach(contact => {
      const contactEl = document.createElement('div');
      contactEl.className = 'contact';
      contactEl.innerHTML = `
        <div class="contact-avatar">${contact.avatar}</div>
        <div class="contact-info">
          <h4>${contact.name}</h4>
          <p>${contact.lastSeen}</p>
        </div>
      `;
      contactEl.addEventListener('click', () => this.openChat(contact));
      contactsList.appendChild(contactEl);
    });
  }

  // ================= SYSTÈME DE CHAT =================
  openChat(contact) {
    this.currentContact = contact;
    document.getElementById('contacts-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');
    document.getElementById('current-contact').textContent = contact.name;
    
    this.loadMessages(contact.id);
    document.getElementById('message-input').focus();
  }

  loadMessages(contactId) {
    if (!this.messages[contactId]) {
      this.messages[contactId] = [];
    }
    
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    this.messages[contactId].forEach(msg => {
      const msgEl = document.createElement('div');
      msgEl.className = `message ${msg.sender}`;
      msgEl.innerHTML = `
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${msg.time}</div>
      `;
      container.appendChild(msgEl);
    });
    
    container.scrollTop = container.scrollHeight;
  }

  sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (text && this.currentContact) {
      // Enregistrer le message envoyé
      this.messages[this.currentContact.id].push({
        text,
        sender: 'me',
        time: this.getCurrentTime()
      });
      
      this.loadMessages(this.currentContact.id);
      input.value = '';

      // En production: envoyer le message au destinataire via API
      console.log(`[SYSTEM] Message à ${this.currentContact.phone}: ${text}`);
      
      // Simuler une réponse (à remplacer par WebSocket en production)
      if (this.isTesting) {
        setTimeout(() => {
          this.messages[this.currentContact.id].push({
            text: this.generateResponse(),
            sender: 'them',
            time: this.getCurrentTime()
          });
          this.loadMessages(this.currentContact.id);
        }, 1000);
      }
    }
  }

  // ================= HELPERS =================
  generateResponse() {
    const responses = [
      "D'accord !",
      "Je vois, intéressant",
      "Merci pour l'info",
      "On en parle plus tard ?",
      "👍",
      "Je suis occupé pour le moment",
      "Pouvez-vous me rappeler plus tard ?",
      "Message reçu"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getPhoneNumber() {
    return document.getElementById('country-code').value + 
           document.getElementById('phone').value.trim();
  }

  validatePhone(phone) {
    return phone.match(/\+1\d{10}/);
  }

  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getEnteredOtp() {
    return Array.from(document.querySelectorAll('.otp-digit'))
               .map(input => input.value)
               .join('');
  }

  getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ================= UI FUNCTIONS =================
  showOtpScreen(phone) {
    document.getElementById('user-phone-display').textContent = phone;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('otp-screen').classList.remove('hidden');
    document.querySelector('.otp-digit').focus();
  }

  showContactsScreen() {
    document.getElementById('otp-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
    document.getElementById('contacts-screen').classList.remove('hidden');
    this.loadContacts();
  }

  showAuthSuccess() {
    const statusEl = document.getElementById('auth-status');
    statusEl.style.display = 'block';
    setTimeout(() => statusEl.style.display = 'none', 3000);
  }

  showError(message, screen = 'auth') {
    const errorElement = document.getElementById(`error-message${screen === 'otp' ? '-otp' : ''}`);
    errorElement.textContent = message;
    setTimeout(() => errorElement.textContent = '', 5000);
  }

  handleOtpInput(e) {
    if (e.target.value.length === 1) {
      const nextIndex = parseInt(e.target.dataset.index) + 1;
      const nextInput = document.querySelector(`.otp-digit[data-index="${nextIndex}"]`);
      if (nextInput) nextInput.focus();
    }
  }

  handleOtpBackspace(e) {
    if (e.key === 'Backspace' && e.target.value === '') {
      const prevIndex = parseInt(e.target.dataset.index) - 1;
      const prevInput = document.querySelector(`.otp-digit[data-index="${prevIndex}"]`);
      if (prevInput) prevInput.focus();
    }
  }

  checkAuthState() {
    // En production: vérifier si l'utilisateur est déjà connecté
    if (localStorage.getItem('marchat_user')) {
      this.currentUser = JSON.parse(localStorage.getItem('marchat_user'));
      this.initContacts();
      this.showContactsScreen();
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  new MarChatApp();
});
