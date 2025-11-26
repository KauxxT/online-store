class ProfileManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.init();
    }

    init() {
        if (!this.currentUser || this.currentUser.role === 'admin') {
            this.showLoginPrompt();
            return;
        }

        this.showProfileContent();
        this.setupEventListeners();
        this.loadUserData();
    }

    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Checkout button
        const checkoutBtn = document.getElementById('profile-checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }

        // Review form
        const reviewForm = document.getElementById('add-review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleAddReview(e));
        }
    }

    showLoginPrompt() {
        const profileContent = document.getElementById('profile-content');
        const loginPrompt = document.getElementById('login-prompt');
        
        if (profileContent) profileContent.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }

    showProfileContent() {
        const profileContent = document.getElementById('profile-content');
        const loginPrompt = document.getElementById('login-prompt');
        
        if (profileContent) profileContent.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
    }

    switchTab(tabName) {
        // Update active tab
        const tabs = document.querySelectorAll('.profile-tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        switch(tabName) {
            case 'cart':
                this.loadCart();
                break;
            case 'favorites':
                this.loadFavorites();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'reviews':
                this.loadUserReviews();
                break;
        }
    }

    loadUserData() {
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <p><strong>Имя пользователя:</strong> ${this.currentUser.username}</p>
                <p><strong>Email:</strong> ${this.currentUser.email || 'Не указан'}</p>
                <p><strong>Дата регистрации:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
            `;
        }
    }

    loadCart() {
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        const container = document.getElementById('profile-cart-items');
        const totalElement = document.getElementById('profile-cart-total');

        if (!container) return;

        if (cartItems.length === 0) {
            container.innerHTML = '<p>Корзина пуста</p>';
            if (totalElement) totalElement.textContent = '0';
            return;
        }

        container.innerHTML = '';
        let total = 0;

        cartItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${this.formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-quantity">
                    <span>Количество: ${item.quantity}</span>
                    <button class="btn-danger remove-from-cart" data-product-id="${item.productId}" style="margin-left: 1rem;">
                        Удалить
                    </button>
                </div>
            `;

            const removeBtn = itemElement.querySelector('.remove-from-cart');
            removeBtn.addEventListener('click', () => this.removeFromCart(item.productId));

            container.appendChild(itemElement);
            total += item.price * item.quantity;
        });

        if (totalElement) {
            totalElement.textContent = this.formatPrice(total);
        }
    }

    removeFromCart(productId) {
        let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        cartItems = cartItems.filter(item => item.productId !== productId);
        localStorage.setItem('cart', JSON.stringify(cartItems));
        this.loadCart();
    }

    loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        const container = document.getElementById('favorites-list');

        if (!container) return;

        if (favorites.length === 0) {
            container.innerHTML = '<p>Нет избранных товаров</p>';
            return;
        }

        container.innerHTML = '';

        favorites.forEach(product => {
            const productElement = this.createFavoriteProductElement(product);
            container.appendChild(productElement);
        });
    }

    createFavoriteProductElement(product) {
        const div = document.createElement('div');
        div.className = 'product-card';

        const finalPrice = product.discount > 0 ? 
            product.price * (1 - product.discount / 100) : 
            product.price;

        div.innerHTML = `
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '📦'}
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-price ${product.discount > 0 ? 'discounted' : ''}">
                    ${product.discount > 0 ? `
                        <span class="original-price">${this.formatPrice(product.price)}</span>
                        <span>${this.formatPrice(finalPrice)}</span>
                    ` : this.formatPrice(finalPrice)}
                </div>
                <p class="product-description">${product.description || 'Описание отсутствует'}</p>
                <div class="product-actions">
                    <button class="btn-primary add-to-cart-from-fav" data-product-id="${product.id}">
                        В корзину
                    </button>
                    <button class="btn-danger remove-from-favorites" data-product-id="${product.id}">
                        Удалить
                    </button>
                </div>
            </div>
        `;

        const addToCartBtn = div.querySelector('.add-to-cart-from-fav');
        const removeFromFavBtn = div.querySelector('.remove-from-favorites');

        addToCartBtn.addEventListener('click', () => this.addToCartFromFavorite(product));
        removeFromFavBtn.addEventListener('click', () => this.removeFromFavorites(product.id));

        return div;
    }

    addToCartFromFavorite(product) {
        let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cartItems.find(item => item.productId === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cartItems.push({
                productId: product.id,
                name: product.name,
                price: product.discount > 0 ? 
                    product.price * (1 - product.discount / 100) : 
                    product.price,
                quantity: 1,
                image: product.image
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cartItems));
        this.showNotification('Товар добавлен в корзину');
    }

    removeFromFavorites(productId) {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favorites = favorites.filter(fav => fav.id !== productId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        this.loadFavorites();
        this.showNotification('Товар удален из избранного');
    }

    async loadOrders() {
        try {
            const response = await fetch(`/api/orders/user?userId=${this.currentUser.id}`);
            const orders = await response.json();
            this.renderOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    renderOrders(orders) {
        const container = document.getElementById('orders-list');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p>Нет истории заказов</p>';
            return;
        }

        container.innerHTML = '';

        orders.reverse().forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.style.cssText = `
                border: 1px solid var(--border-color);
                border-radius: 0.375rem;
                padding: 1rem;
                margin-bottom: 1rem;
            `;

            orderElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4>Заказ #${order.id}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">
                            ${new Date(order.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <strong>${this.formatPrice(order.total)}</strong>
                        <div style="color: var(--success-color);">${order.status}</div>
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                            <span>${item.name} × ${item.quantity}</span>
                            <span>${this.formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
            `;

            container.appendChild(orderElement);
        });
    }

    async loadUserReviews() {
        await this.loadProductsForReview();
        await this.loadExistingReviews();
    }

    async loadProductsForReview() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            this.populateProductsSelect(products);
        } catch (error) {
            console.error('Error loading products for review:', error);
        }
    }

    populateProductsSelect(products) {
        const select = document.getElementById('review-product');
        if (!select) return;

        select.innerHTML = '<option value="">Выберите товар</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    }

    async loadExistingReviews() {
        try {
            const response = await fetch('/api/reviews');
            const reviews = await response.json();
            const userReviews = reviews.filter(review => review.userId === this.currentUser.id);
            this.renderUserReviews(userReviews);
        } catch (error) {
            console.error('Error loading user reviews:', error);
        }
    }

    renderUserReviews(reviews) {
        const container = document.getElementById('user-reviews-list');
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = '<p>У вас пока нет отзывов</p>';
            return;
        }

        container.innerHTML = '';

        reviews.reverse().forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'user-review-item';
            reviewElement.style.cssText = `
                border: 1px solid var(--border-color);
                border-radius: 0.375rem;
                padding: 1rem;
                margin-bottom: 1rem;
            `;

            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

            reviewElement.innerHTML = `
                <div style="margin-bottom: 0.5rem;">
                    <strong>${review.productName || 'Товар'}</strong>
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${new Date(review.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <div>${stars}</div>
                </div>
                <p>${review.text}</p>
                ${review.adminReply ? `
                    <div style="background: var(--surface-color); padding: 0.5rem; border-radius: 0.25rem; margin-top: 0.5rem;">
                        <strong>Ответ администратора:</strong>
                        <p>${review.adminReply}</p>
                    </div>
                ` : '<p style="color: var(--text-secondary); font-style: italic;">Ожидает ответа администратора</p>'}
            `;

            container.appendChild(reviewElement);
        });
    }

    async handleAddReview(e) {
        e.preventDefault();
        
        const productId = document.getElementById('review-product').value;
        const text = document.getElementById('review-text').value;
        const rating = document.getElementById('review-rating').value;

        if (!productId || !text) {
            this.showNotification('Заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    userName: this.currentUser.username,
                    productId: parseInt(productId),
                    text,
                    rating: parseInt(rating)
                })
            });

            if (response.ok) {
                e.target.reset();
                this.loadUserReviews();
                this.showNotification('Отзыв добавлен успешно!');
            } else {
                this.showNotification('Ошибка при добавлении отзыва');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async checkout() {
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cartItems.length === 0) {
            this.showNotification('Корзина пуста');
            return;
        }

        try {
            const order = {
                userId: this.currentUser.id,
                items: cartItems,
                total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
                localStorage.removeItem('cart');
                this.loadCart();
                window.location.href = '/success.html';
            } else {
                this.showNotification('Ошибка при оформлении заказа');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT'
        }).format(price);
    }

    showNotification(message) {
        if (window.authManager) {
            window.authManager.showNotification(message);
        } else {
            alert(message);
        }
    }
}

// Initialize profile manager
const profileManager = new ProfileManager();