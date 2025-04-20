class AuthSystem {
    constructor() {
        this.users = {};
        this.currentSession = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Envoi OTP
        document.getElementById('send-otp').addEventListener('click', () => this.sendOtp());
        
        // Vérification OTP
        document.getElementById('verify-otp').addEventListener('click', () => this.verifyOtp());
        
        // Déconnexion
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Gestion des inputs OTP
        document.querySelectorAll('.otp-digit').forEach(digit => {
            digit.addEventListener('input', (e) => this.handleOtpInput(e));
            digit.addEventListener('keydown', (e) => this.handleOtpBackspace(e));
        });
    }

    sendOtp() {
        const phone = this.getPhoneNumber();
        
        if (!this.validatePhone(phone)) {
            this.showError("Format invalide. Ex: +18093978951");
            return;
        }

        const otp = this.generateOtp();
        this.users[phone] = { otp, verified: false };
        
        // En production: remplacer par un vrai envoi SMS
        console.log(`[SYSTEM] Code OTP pour ${phone}: ${otp}`);
        alert(`CODE DE DÉMO : ${otp}\n\n(En production, ce code serait envoyé par SMS)`);

        this.showOtpScreen(phone);
    }

    verifyOtp() {
        const phone = document.getElementById('user-phone-display').textContent;
        const enteredOtp = this.getEnteredOtp();
        
        if (this.users[phone] && this.users[phone].otp === enteredOtp) {
            this.users[phone].verified = true;
            this.currentSession = phone;
            this.showChatScreen();
            this.showAuthStatus();
        } else {
            this.showError("Code incorrect. Veuillez réessayer.");
        }
    }

    logout() {
        this.currentSession = null;
        document.getElementById('chat-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        this.clearOtpInputs();
    }

    // Helpers
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

    clearOtpInputs() {
        document.querySelectorAll('.otp-digit').forEach(input => input.value = '');
    }

    // UI Functions
    showOtpScreen(phone) {
        document.getElementById('user-phone-display').textContent = phone;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('otp-screen').classList.remove('hidden');
        document.querySelector('.otp-digit').focus();
    }

    showChatScreen() {
        document.getElementById('otp-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
    }

    showAuthStatus() {
        const statusEl = document.getElementById('auth-status');
        statusEl.style.display = 'block';
        setTimeout(() => statusEl.style.display = 'none', 3000);
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
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
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new AuthSystem();
});
