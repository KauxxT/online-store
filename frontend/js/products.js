class ProductManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.filteredProducts = [];
        this.selectedCategory = null;
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadProducts();
        this.renderCategories();
        this.renderProducts();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            this.categories = await response.json();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
            this.filteredProducts = [...this.products];
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderCategories() {
        const container = document.getElementById('categories-filter');
        if (!container) return;

        container.innerHTML = '';

        // All categories button
        const allBtn = document.createElement('button');
        allBtn.className = `category-btn ${this.selectedCategory === null ? 'active' : ''}`;
        allBtn.textContent = 'Все товары';
        allBtn.addEventListener('click', () => this.filterByCategory(null));
        container.appendChild(allBtn);

        // Category buttons
        this.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${this.selectedCategory === category.id ? 'active' : ''}`;
            btn.textContent = category.name;
            btn.addEventListener('click', () => this.filterByCategory(category.id));
            container.appendChild(btn);
        });
    }

    renderProducts() {
        const container = document.getElementById('products-grid');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredProducts.length === 0) {
            container.innerHTML = '<p>Товары не найдены</p>';
            return;
        }

        this.filteredProducts.forEach(product => {
            const productElement = this.createProductElement(product);
            container.appendChild(productElement);
        });
    }

    createProductElement(product) {
        const div = document.createElement('div');
        div.className = 'product-card';

        const finalPrice = product.discount > 0 ? 
            product.price * (1 - product.discount / 100) : 
            product.price;

        div.innerHTML = `
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` : '📦'}
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
                    <button class="btn-primary add-to-cart" data-product-id="${product.id}">
                        В корзину
                    </button>
                    <button class="btn-secondary add-to-favorite" data-product-id="${product.id}">
                        ❤️
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const addToCartBtn = div.querySelector('.add-to-cart');
        const addToFavoriteBtn = div.querySelector('.add-to-favorite');

        addToCartBtn.addEventListener('click', () => {
            cartManager.addToCart(product);
        });

        addToFavoriteBtn.addEventListener('click', () => {
            this.addToFavorites(product);
        });

        return div;
    }

    filterByCategory(categoryId) {
        this.selectedCategory = categoryId;
        
        if (categoryId === null) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product => 
                product.categoryId === categoryId
            );
        }

        this.renderCategories();
        this.renderProducts();
    }

    addToFavorites(product) {
        if (!authManager.isLoggedIn()) {
            authManager.showNotification('Войдите, чтобы добавлять товары в избранное');
            authManager.toggleAuthModal();
            return;
        }

        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        
        const existingIndex = favorites.findIndex(fav => fav.id === product.id);
        
        if (existingIndex === -1) {
            favorites.push(product);
            authManager.showNotification('Товар добавлен в избранное');
        } else {
            favorites.splice(existingIndex, 1);
            authManager.showNotification('Товар удален из избранного');
        }
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
        
        // Update product stats
        this.updateProductStats(product.id, 'favorited', existingIndex === -1 ? 1 : -1);
    }

    async updateProductStats(productId, stat, change) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                const newStats = { ...product.stats };
                newStats[stat] = Math.max(0, newStats[stat] + change);
                
                await fetch(`/api/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ stats: newStats })
                });
            }
        } catch (error) {
            console.error('Error updating product stats:', error);
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT'
        }).format(price);
    }

    setupEventListeners() {
        // Search functionality can be added here
    }

    getProductById(id) {
        return this.products.find(product => product.id === id);
    }
}

// Initialize product manager
const productManager = new ProductManager();