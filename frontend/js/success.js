class SuccessPage {
    constructor() {
        this.init();
    }

    init() {
        this.loadOrderDetails();
    }

    async loadOrderDetails() {
        // Get the latest order from localStorage or API
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!currentUser) {
            this.showGenericSuccess();
            return;
        }

        try {
            const response = await fetch(`/api/orders/user?userId=${currentUser.id}`);
            const orders = await response.json();
            
            if (orders.length > 0) {
                const latestOrder = orders[orders.length - 1];
                this.renderOrderDetails(latestOrder);
            } else {
                this.showGenericSuccess();
            }
        } catch (error) {
            this.showGenericSuccess();
        }
    }

    renderOrderDetails(order) {
        const itemsContainer = document.getElementById('order-items');
        const totalElement = document.getElementById('order-total-amount');

        if (itemsContainer) {
            itemsContainer.innerHTML = order.items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${item.name}</strong>
                        <div style="color: var(--text-secondary); font-size: 0.9rem;">
                            ${item.quantity} × ${this.formatPrice(item.price)}
                        </div>
                    </div>
                    <div>${this.formatPrice(item.price * item.quantity)}</div>
                </div>
            `).join('');
        }

        if (totalElement) {
            totalElement.textContent = this.formatPrice(order.total);
        }
    }

    showGenericSuccess() {
        const orderDetails = document.getElementById('order-details');
        if (orderDetails) {
            orderDetails.style.display = 'none';
        }
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-KZ', {
            style: 'currency',
            currency: 'KZT'
        }).format(price);
    }
}

// Initialize success page
const successPage = new SuccessPage();