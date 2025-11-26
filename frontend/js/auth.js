class AuthManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.isLoginMode = true;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Auth button
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => this.toggleAuthModal());
        }

        // Auth modal
        const authModal = document.getElementById('auth-modal');
        const closeAuthModal = document.getElementById('close-auth-modal');
        const authForm = document.getElementById('auth-form');
        const authSwitchLink = document.getElementById('auth-switch-link');

        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => this.hideAuthModal());
        }

        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) this.hideAuthModal();
            });
        }

        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        }

        if (authSwitchLink) {
            authSwitchLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }
    }

    toggleAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (this.currentUser) {
            this.logout();
        } else {
            authModal.classList.add('active');
        }
    }

    hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        authModal.classList.remove('active');
        this.resetAuthForm();
    }

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        this.updateAuthModal();
    }

    updateAuthModal() {
        const authModalTitle = document.getElementById('auth-modal-title');
        const authSwitchText = document.getElementById('auth-switch-text');
        const authSwitchLink = document.getElementById('auth-switch-link');
        const emailField = document.getElementById('email-field');
        const submitBtn = document.querySelector('#auth-form button[type="submit"]');

        if (this.isLoginMode) {
            authModalTitle.textContent = 'Вход';
            submitBtn.textContent = 'Войти';
            authSwitchText.innerHTML = 'Нет аккаунта? <a href="#" id="auth-switch-link">Зарегистрироваться</a>';
            emailField.style.display = 'none';
        } else {
            authModalTitle.textContent = 'Регистрация';
            submitBtn.textContent = 'Зарегистрироваться';
            authSwitchText.innerHTML = 'Уже есть аккаунт? <a href="#" id="auth-switch-link">Войти</a>';
            emailField.style.display = 'block';
        }

        // Re-attach event listener to the new link
        const newAuthSwitchLink = document.getElementById('auth-switch-link');
        if (newAuthSwitchLink) {
            newAuthSwitchLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }
    }

    resetAuthForm() {
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.reset();
        }
        this.isLoginMode = true;
        this.updateAuthModal();
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const email = formData.get('email');

        const endpoint = this.isLoginMode ? '/api/login' : '/api/register';
        const payload = this.isLoginMode ? { username, password } : { username, password, email };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                this.hideAuthModal();
                this.updateUI();
                this.showNotification(this.isLoginMode ? 'Вход выполнен успешно!' : 'Регистрация прошла успешно!');
            } else {
                this.showNotification(data.message || 'Ошибка аутентификации');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        this.showNotification('Выход выполнен успешно!');
    }

    updateUI() {
        const authBtn = document.getElementById('auth-btn');
        const profileLink = document.getElementById('profile-link');
        const adminLink = document.getElementById('admin-link');
        const checkoutBtn = document.getElementById('checkout-btn');
        const registerPromptBtn = document.getElementById('register-prompt-btn');

        if (authBtn) {
            authBtn.textContent = this.currentUser ? 'Выйти' : 'Войти';
        }

        if (profileLink) {
            profileLink.style.display = this.currentUser && this.currentUser.role !== 'admin' ? 'block' : 'none';
        }

        if (adminLink) {
            adminLink.style.display = this.currentUser && this.currentUser.role === 'admin' ? 'block' : 'none';
        }

        if (checkoutBtn && registerPromptBtn) {
            if (this.currentUser && this.currentUser.role !== 'admin') {
                checkoutBtn.style.display = 'block';
                registerPromptBtn.style.display = 'none';
            } else {
                checkoutBtn.style.display = 'none';
                registerPromptBtn.style.display = this.currentUser ? 'none' : 'block';
            }
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.375rem;
            box-shadow: var(--shadow-lg);
            z-index: 1002;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Initialize auth manager
const authManager = new AuthManager();