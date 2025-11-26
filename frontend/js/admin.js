class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login form
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Category management
        const addCategoryForm = document.getElementById('add-category-form');
        if (addCategoryForm) {
            addCategoryForm.addEventListener('submit', (e) => this.handleAddCategory(e));
        }

        // Product management
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => this.handleAddProduct(e));
        }
    }

    async checkAuth() {
        // For admin panel, we'll use simple session check
        const adminAuth = sessionStorage.getItem('adminAuthenticated');
        if (adminAuth === 'true') {
            this.isAuthenticated = true;
            this.showDashboard();
        } else {
            this.showLoginForm();
        }
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success && data.user.role === 'admin') {
                this.isAuthenticated = true;
                sessionStorage.setItem('adminAuthenticated', 'true');
                this.showDashboard();
                this.showNotification('Вход выполнен успешно!');
            } else {
                this.showNotification('Неверные учетные данные администратора');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    logout() {
        this.isAuthenticated = false;
        sessionStorage.removeItem('adminAuthenticated');
        this.showLoginForm();
        this.showNotification('Выход выполнен успешно!');
    }

    showLoginForm() {
        const loginSection = document.getElementById('admin-login');
        const dashboard = document.getElementById('admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'block';
        if (dashboard) dashboard.style.display = 'none';
    }

    showDashboard() {
        const loginSection = document.getElementById('admin-login');
        const dashboard = document.getElementById('admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        
        this.loadStats();
        this.loadCategories();
        this.loadProducts();
        this.loadReviews();
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            this.renderStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderStats(stats) {
        const container = document.getElementById('stats-container');
        if (!container) return;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${this.formatPrice(stats.totalRevenue)}</div>
                <div>Общая выручка</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.totalOrders}</div>
                <div>Всего заказов</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.topProducts.length}</div>
                <div>Товаров в топе</div>
            </div>
        `;
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();
            this.renderCategories(categories);
            this.populateCategorySelect(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = '';

        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border: 1px solid var(--border-color);
                border-radius: 0.375rem;
                margin-bottom: 0.5rem;
            `;
            
            div.innerHTML = `
                <span>${category.name}</span>
                <button class="btn-danger delete-category" data-category-id="${category.id}">
                    Удалить
                </button>
            `;

            const deleteBtn = div.querySelector('.delete-category');
            deleteBtn.addEventListener('click', () => this.deleteCategory(category.id));

            container.appendChild(div);
        });
    }

    populateCategorySelect(categories) {
        const select = document.getElementById('product-category');
        if (!select) return;

        select.innerHTML = '<option value="">Выберите категорию</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    async handleAddCategory(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('category-name');
        const name = nameInput.value.trim();

        if (!name) return;

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                nameInput.value = '';
                this.loadCategories();
                this.showNotification('Категория добавлена успешно!');
            } else {
                this.showNotification('Ошибка при добавлении категории');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Удалить категорию и все связанные товары?')) return;

        try {
            const response = await fetch(`/api/categories/${categoryId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadCategories();
                this.loadProducts();
                this.showNotification('Категория удалена успешно!');
            } else {
                this.showNotification('Ошибка при удалении категории');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            this.renderProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts(products) {
        const container = document.getElementById('products-management-list');
        if (!container) return;

        container.innerHTML = '';

        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'product-management-item';
            div.style.cssText = `
                border: 1px solid var(--border-color);
                border-radius: 0.375rem;
                padding: 1rem;
                margin-bottom: 1rem;
            `;
            
            const finalPrice = product.discount > 0 ? 
                product.price * (1 - product.discount / 100) : 
                product.price;

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4>${product.name}</h4>
                        <p>Категория: ${product.category?.name || 'Не указана'}</p>
                        <p>Цена: ${this.formatPrice(finalPrice)} 
                           ${product.discount > 0 ? `<span style="color: var(--text-secondary); text-decoration: line-through;">${this.formatPrice(product.price)}</span>` : ''}
                        </p>
                        <p>Закуплено: ${product.stats.purchased} | В избранном: ${product.stats.favorited}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-secondary edit-product" data-product-id="${product.id}">
                            Редактировать
                        </button>
                        <button class="btn-danger delete-product" data-product-id="${product.id}">
                            Удалить
                        </button>
                    </div>
                </div>
            `;

            const editBtn = div.querySelector('.edit-product');
            const deleteBtn = div.querySelector('.delete-product');

            editBtn.addEventListener('click', () => this.editProduct(product));
            deleteBtn.addEventListener('click', () => this.deleteProduct(product.id));

            container.appendChild(div);
        });
    }

    async handleAddProduct(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            categoryId: parseInt(document.getElementById('product-category').value),
            description: document.getElementById('product-description').value,
            discount: parseInt(document.getElementById('product-discount').value) || 0
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                e.target.reset();
                this.loadProducts();
                this.showNotification('Товар добавлен успешно!');
            } else {
                this.showNotification('Ошибка при добавлении товара');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    editProduct(product) {
        // Simple edit implementation - in real app would use a modal
        const newPrice = prompt('Новая цена:', product.price);
        if (newPrice && !isNaN(newPrice)) {
            this.updateProduct(product.id, { price: parseFloat(newPrice) });
        }
    }

    async updateProduct(productId, updateData) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.loadProducts();
                this.showNotification('Товар обновлен успешно!');
            } else {
                this.showNotification('Ошибка при обновлении товара');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Удалить товар?')) return;

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadProducts();
                this.showNotification('Товар удален успешно!');
            } else {
                this.showNotification('Ошибка при удалении товара');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async loadReviews() {
        try {
            const response = await fetch('/api/reviews');
            const reviews = await response.json();
            this.renderReviews(reviews);
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    renderReviews(reviews) {
        const container = document.getElementById('reviews-list');
        if (!container) return;

        container.innerHTML = '';

        reviews.forEach(review => {
            const div = document.createElement('div');
            div.className = 'review-item';
            div.style.cssText = `
                border: 1px solid var(--border-color);
                border-radius: 0.375rem;
                padding: 1rem;
                margin-bottom: 1rem;
            `;
            
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            div.innerHTML = `
                <div style="margin-bottom: 0.5rem;">
                    <strong>${review.userName || 'Пользователь'}</strong>
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
                ` : `
                    <div class="admin-reply-form" style="margin-top: 0.5rem;">
                        <textarea class="admin-reply-text" placeholder="Ответ администратора..." style="width: 100%; padding: 0.5rem;"></textarea>
                        <button class="btn-primary submit-reply" data-review-id="${review.id}" style="margin-top: 0.5rem;">
                            Ответить
                        </button>
                    </div>
                `}
            `;

            const replyBtn = div.querySelector('.submit-reply');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => this.handleAdminReply(review.id, div));
            }

            container.appendChild(div);
        });
    }

    async handleAdminReply(reviewId, reviewElement) {
        const replyText = reviewElement.querySelector('.admin-reply-text').value.trim();
        
        if (!replyText) {
            this.showNotification('Введите текст ответа');
            return;
        }

        try {
            const response = await fetch(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ adminReply: replyText })
            });

            if (response.ok) {
                this.loadReviews();
                this.showNotification('Ответ добавлен успешно!');
            } else {
                this.showNotification('Ошибка при добавлении ответа');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT'
        }).format(price);
    }

    showNotification(message) {
        // Reuse the notification system from auth.js
        if (window.authManager) {
            window.authManager.showNotification(message);
        } else {
            // Fallback notification
            alert(message);
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();