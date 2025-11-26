class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.products = [];
        this.categories = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleAdminLogin(e));
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Categories
        const addCategoryForm = document.getElementById('add-category-form');
        if (addCategoryForm) {
            addCategoryForm.addEventListener('submit', (e) => this.handleAddCategory(e));
        }

        // Products
        const addProductForm = document.getElementById('add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => this.handleAddProduct(e));
        }

        // Discounts
        const categoryDiscountBtn = document.getElementById('apply-category-discount');
        const productDiscountBtn = document.getElementById('apply-product-discount');
        
        if (categoryDiscountBtn) {
            categoryDiscountBtn.addEventListener('click', () => this.applyCategoryDiscount());
        }
        if (productDiscountBtn) {
            productDiscountBtn.addEventListener('click', () => this.applyProductDiscount());
        }
    }

    async checkAuth() {
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
            this.categories = await response.json();
            this.renderCategories();
            this.populateCategorySelects();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategories() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = '';

        this.categories.forEach(category => {
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

    populateCategorySelects() {
        const selects = ['product-category', 'discount-category'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Выберите категорию</option>';
                this.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
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
            this.products = await response.json();
            this.renderProducts();
            this.populateProductSelect();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts() {
        const container = document.getElementById('products-management-list');
        if (!container) return;

        container.innerHTML = '';

        this.products.forEach(product => {
            const productElement = this.createProductElement(product);
            container.appendChild(productElement);
        });
    }

    createProductElement(product) {
        const div = document.createElement('div');
        div.className = 'product-management-item';
        
        const finalPrice = product.discount > 0 ? 
            product.price * (1 - product.discount / 100) : 
            product.price;

        const category = this.categories.find(c => c.id === product.categoryId);

        div.innerHTML = `
            <div class="product-header">
                <div style="display: flex; gap: 1rem; align-items: start; flex: 1;">
                    ${product.image ? `
                        <img src="${product.image}" alt="${product.name}" class="product-image-small">
                    ` : '<div style="width: 80px; height: 80px; background: var(--border-color); border-radius: 0.375rem; display: flex; align-items: center; justify-content: center;">📦</div>'}
                    
                    <div style="flex: 1;">
                        <h4>${product.name}</h4>
                        <p style="color: var(--text-secondary); margin: 0.25rem 0;">
                            Категория: ${category?.name || 'Не указана'}
                        </p>
                        <p style="margin: 0.25rem 0;">
                            Цена: 
                            <span class="${product.discount > 0 ? 'discounted' : ''}">
                                ${this.formatPrice(finalPrice)}
                                ${product.discount > 0 ? 
                                    `<span style="color: var(--text-secondary); text-decoration: line-through; margin-left: 0.5rem;">
                                        ${this.formatPrice(product.price)}
                                    </span>
                                    <span class="stats-badge">-${product.discount}%</span>` 
                                    : ''
                                }
                            </span>
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0.25rem 0;">
                            Статистика: 
                            <span class="stats-badge">🛒 ${product.stats.purchased}</span>
                            <span class="stats-badge">❤️ ${product.stats.favorited}</span>
                        </p>
                        ${product.description ? `<p style="margin: 0.5rem 0; font-size: 0.9rem;">${product.description}</p>` : ''}
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn-primary edit-product-btn" data-product-id="${product.id}">
                        Редактировать
                    </button>
                    <button class="btn-danger delete-product" data-product-id="${product.id}">
                        Удалить
                    </button>
                </div>
            </div>
            
            <div id="edit-form-${product.id}" class="edit-form" style="display: none;">
                <h5>Редактирование товара</h5>
                <form class="edit-product-form" data-product-id="${product.id}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Название:</label>
                            <input type="text" value="${product.name}" class="edit-name" required>
                        </div>
                        <div class="form-group">
                            <label>Цена (₸):</label>
                            <input type="number" value="${product.price}" class="edit-price" required min="0">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Категория:</label>
                            <select class="edit-category">
                                ${this.categories.map(cat => 
                                    `<option value="${cat.id}" ${cat.id === product.categoryId ? 'selected' : ''}>${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Скидка (%):</label>
                            <input type="number" value="${product.discount}" class="edit-discount" min="0" max="100">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Изображение (URL):</label>
                            <input type="text" value="${product.image || ''}" class="edit-image" placeholder="https://example.com/image.jpg">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea class="edit-description" rows="2">${product.description || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Сохранить</button>
                        <button type="button" class="btn-secondary cancel-edit">Отмена</button>
                    </div>
                </form>
            </div>
        `;

        // Event handlers
        const editBtn = div.querySelector('.edit-product-btn');
        const deleteBtn = div.querySelector('.delete-product');
        const editForm = div.querySelector('.edit-product-form');
        const cancelBtn = div.querySelector('.cancel-edit');

        editBtn.addEventListener('click', () => this.toggleEditForm(product.id));
        deleteBtn.addEventListener('click', () => this.deleteProduct(product.id));
        editForm.addEventListener('submit', (e) => this.handleEditProduct(e, product.id));
        cancelBtn.addEventListener('click', () => this.toggleEditForm(product.id));

        return div;
    }

    toggleEditForm(productId) {
        const editForm = document.getElementById(`edit-form-${productId}`);
        if (editForm) {
            editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
        }
    }

    async handleEditProduct(e, productId) {
        e.preventDefault();
        
        const form = e.target;
        const formData = {
            name: form.querySelector('.edit-name').value,
            price: parseFloat(form.querySelector('.edit-price').value),
            categoryId: parseInt(form.querySelector('.edit-category').value),
            discount: parseInt(form.querySelector('.edit-discount').value) || 0,
            image: form.querySelector('.edit-image').value,
            description: form.querySelector('.edit-description').value
        };

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.toggleEditForm(productId);
                this.loadProducts();
                this.showNotification('Товар обновлен успешно!');
            } else {
                this.showNotification('Ошибка при обновлении товара');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async handleAddProduct(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            categoryId: parseInt(document.getElementById('product-category').value),
            description: document.getElementById('product-description').value,
            image: document.getElementById('product-image').value,
            discount: 0,
            stats: { purchased: 0, favorited: 0 }
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

    populateProductSelect() {
        const select = document.getElementById('discount-product');
        if (!select) return;

        select.innerHTML = '<option value="">Выберите товар</option>';
        this.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    }

    async applyCategoryDiscount() {
        const categoryId = document.getElementById('discount-category').value;
        const discount = document.getElementById('category-discount').value;

        if (!categoryId || discount === '') {
            this.showNotification('Выберите категорию и укажите скидку');
            return;
        }

        try {
            const response = await fetch('/api/categories/discount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    categoryId: parseInt(categoryId),
                    discount: parseInt(discount)
                })
            });

            if (response.ok) {
                document.getElementById('category-discount').value = '';
                this.loadProducts();
                this.showNotification('Скидка применена к категории!');
            } else {
                this.showNotification('Ошибка при применении скидки');
            }
        } catch (error) {
            this.showNotification('Ошибка сети. Попробуйте позже.');
        }
    }

    async applyProductDiscount() {
        const productId = document.getElementById('discount-product').value;
        const discount = document.getElementById('product-discount-value').value;

        if (!productId || discount === '') {
            this.showNotification('Выберите товар и укажите скидку');
            return;
        }

        try {
            const response = await fetch('/api/products/discount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: parseInt(productId),
                    discount: parseInt(discount)
                })
            });

            if (response.ok) {
                document.getElementById('product-discount-value').value = '';
                this.loadProducts();
                this.showNotification('Скидка применена к товару!');
            } else {
                this.showNotification('Ошибка при применении скидки');
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
        if (window.authManager && window.authManager.showNotification) {
            window.authManager.showNotification(message);
        } else {
            alert(message);
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();