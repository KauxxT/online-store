class CartManager {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCartUI();
    }

    setupEventListeners() {
        // Cart toggle
        const cartToggle = document.getElementById('cart-toggle');
        const closeCart = document.getElementById('close-cart');
        const cartOverlay = document.getElementById('cart-overlay');
        const continueShopping = document.getElementById('continue-shopping');

        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }

        if (closeCart) {
            closeCart.addEventListener('click', () => this.hideCart());
        }

        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => this.hideCart());
        }

        if (continueShopping) {
            continueShopping.addEventListener('click', () => this.hideCart());
        }

        // Checkout
        const checkoutBtn = document.getElementById('checkout-btn');
        const registerPromptBtn = document.getElementById('register-prompt-btn');

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }

        if (registerPromptBtn) {
            registerPromptBtn.addEventListener('click', () => {
                this.hideCart();
                authManager.toggleAuthModal();
            });
        }
    }

    toggleCart() {
        const cartSlider = document.getElementById('cart-slider');
        const cartOverlay = document.getElementById('cart-overlay');
        
        cartSlider.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    hideCart() {
        const cartSlider = document.getElementById('cart-slider');
        const cartOverlay = document.getElementById('cart-overlay');
        
        cartSlider.classList.remove('active');
        cartOverlay.classList.remove('active');
    }

    addToCart(product) {
        const existingItem = this.items.find(item => item.productId === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                productId: product.id,
                name: product.name,
                price: product.discount > 0 ? 
                    product.price * (1 - product.discount / 100) : 
                    product.price,
                quantity: 1,
                image: product.image
            });
        }
        
        this.saveCart();
        this.updateCartUI();
        authManager.showNotification('Товар добавлен в корзину');
    }

    removeFromCart(productId) {
        this.items = this.items.filter(item => item.productId !== productId);
        this.saveCart();
        this.updateCartUI();
    }

    updateQuantity(productId, change) {
        const item = this.items.find(item => item.productId === productId);
        
        if (item) {
            item.quantity += change;
            
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    updateCartUI() {
        this.renderCartItems();
        this.updateCartTotal();
        this.updateCartButton();
    }

    renderCartItems() {
        const container = document.getElementById('cart-items');
        if (!container) return;

        container.innerHTML = '';

        if (this.items.length === 0) {
            container.innerHTML = '<p>Корзина пуста</p>';
            return;
        }

        this.items.forEach(item => {
            const itemElement = this.createCartItemElement(item);
            container.appendChild(itemElement);
        });
    }

    createCartItemElement(item) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-price">${this.formatPrice(item.price)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" data-action="decrease" data-product-id="${item.productId}">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" data-action="increase" data-product-id="${item.productId}">+</button>
                <button class="btn-icon" data-action="remove" data-product-id="${item.productId}" style="margin-left: 0.5rem;">🗑️</button>
            </div>
        `;

        // Add event listeners
        const decreaseBtn = div.querySelector('[data-action="decrease"]');
        const increaseBtn = div.querySelector('[data-action="increase"]');
        const removeBtn = div.querySelector('[data-action="remove"]');

        decreaseBtn.addEventListener('click', () => this.updateQuantity(item.productId, -1));
        increaseBtn.addEventListener('click', () => this.updateQuantity(item.productId, 1));
        removeBtn.addEventListener('click', () => this.removeFromCart(item.productId));

        return div;
    }

    updateCartTotal() {
        const totalElement = document.getElementById('cart-total-price');
        if (totalElement) {
            const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalElement.textContent = this.formatPrice(total);
        }
    }

    updateCartButton() {
        const cartToggle = document.getElementById('cart-toggle');
        if (cartToggle) {
            const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                cartToggle.textContent = `🛒 ${totalItems}`;
            } else {
                cartToggle.textContent = '🛒';
            }
        }
    }

    async checkout() {
        if (!authManager.isLoggedIn() || authManager.isAdmin()) {
            authManager.showNotification('Войдите как пользователь для оформления заказа');
            return;
        }

        if (this.items.length === 0) {
            authManager.showNotification('Корзина пуста');
            return;
        }

        try {
            const user = authManager.getCurrentUser();
            const order = {
                userId: user.id,
                items: this.items,
                total: this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(order)
            });

            if (response.ok) {
                // Clear cart
                this.items = [];
                this.saveCart();
                this.updateCartUI();
                this.hideCart();
                
                // Redirect to success page
                window.location.href = '/success.html';
            } else {
                authManager.showNotification('Ошибка при оформлении заказа');
            }
        } catch (error) {
            authManager.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT'
        }).format(price);
    }

    getCartItems() {
        return this.items;
    }

    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateCartUI();
    }
}

// Initialize cart manager
const cartManager = new CartManager();