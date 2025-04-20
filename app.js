// Variables globales
let currentOtp = "123456";
let lastPhoneUsed = "";

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Écouteurs d'événements
    document.getElementById('send-otp').addEventListener('click', sendOtp);
    document.getElementById('verify-otp').addEventListener('click', verifyOtp);
    
    // Gestion des inputs OTP
    document.querySelectorAll('.otp-digit').forEach(digit => {
        digit.addEventListener('input', function(e) {
            if (this.value.length === 1) {
                const nextIndex = parseInt(this.dataset.index) + 1;
                const nextInput = document.querySelector(`.otp-digit[data-index="${nextIndex}"]`);
                if (nextInput) nextInput.focus();
            }
        });
        
        digit.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '') {
                const prevIndex = parseInt(this.dataset.index) - 1;
                const prevInput = document.querySelector(`.otp-digit[data-index="${prevIndex}"]`);
                if (prevInput) prevInput.focus();
            }
        });
    });
});

function sendOtp() {
    const phoneNumber = document.getElementById('country-code').value + 
                       document.getElementById('phone').value.trim();
    
    if (!phoneNumber.match(/\+1\d{10}/)) {
        showError("Format invalide. Ex: +18093978951");
        return;
    }
    
    // Génère un nouveau code aléatoire
    currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('fake-otp').textContent = currentOtp;
    lastPhoneUsed = phoneNumber;
    
    // Affiche l'écran OTP
    document.getElementById('user-phone-display').textContent = phoneNumber;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('otp-screen').classList.remove('hidden');
    document.querySelector('.otp-digit').focus();
    
    console.log(`[DEV] Code OTP généré: ${currentOtp}`);
}

function verifyOtp() {
    const enteredOtp = Array.from(document.querySelectorAll('.otp-digit'))
                          .map(input => input.value)
                          .join('');
    
    if (enteredOtp === currentOtp) {
        // Connexion réussie
        document.getElementById('otp-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        console.log("[DEV] Connexion réussie !");
    } else {
        showError(`Code incorrect. Le code attendu est: ${currentOtp}`);
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    setTimeout(() => errorElement.textContent = '', 5000);
}
