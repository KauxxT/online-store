const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files with default data
const initializeData = () => {
    const defaultFiles = {
        'users.json': [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                role: 'admin',
                email: 'admin@store.kz',
                createdAt: new Date().toISOString()
            }
        ],
        'categories.json': [
            { id: 1, name: 'Электроника' },
            { id: 2, name: 'Одежда' },
            { id: 3, name: 'Книги' }
        ],
        'products.json': [
            {
                id: 1,
                name: 'Смартфон',
                price: 150000,
                categoryId: 1,
                description: 'Современный смартфон',
                image: '/assets/phone.jpg',
                discount: 0,
                stats: { purchased: 0, favorited: 0 }
            },
            {
                id: 2,
                name: 'Футболка',
                price: 5000,
                categoryId: 2,
                description: 'Хлопковая футболка',
                image: '/assets/tshirt.jpg',
                discount: 0,
                stats: { purchased: 0, favorited: 0 }
            }
        ],
        'reviews.json': [],
        'orders.json': []
    };

    Object.entries(defaultFiles).forEach(([filename, data]) => {
        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        }
    });
};

initializeData();

// Helper functions
const readJSON = (filename) => {
    try {
        const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeJSON = (filename, data) => {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
};

const sendResponse = (res, statusCode, data = null) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
};

const serveStaticFile = (req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = path.join(__dirname, '../frontend', parsedUrl.pathname);
    
    // Default to index.html for root
    if (parsedUrl.pathname === '/') {
        pathname = path.join(__dirname, '../frontend/index.html');
    }
    
    fs.readFile(pathname, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(pathname);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };
        
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
};

// API Routes
const handleAPI = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Auth routes
    if (pathname === '/api/login' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { username, password } = JSON.parse(body);
            const users = readJSON('users.json');
            const user = users.find(u => u.username === username && u.password === password);
            
            if (user) {
                sendResponse(res, 200, { 
                    success: true, 
                    user: { 
                        id: user.id, 
                        username: user.username, 
                        role: user.role,
                        email: user.email 
                    } 
                });
            } else {
                sendResponse(res, 401, { success: false, message: 'Неверные учетные данные' });
            }
        });
        return;
    }

    if (pathname === '/api/register' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { username, password, email } = JSON.parse(body);
            const users = readJSON('users.json');
            
            if (users.find(u => u.username === username)) {
                sendResponse(res, 400, { success: false, message: 'Пользователь уже существует' });
                return;
            }
            
            const newUser = {
                id: users.length + 1,
                username,
                password,
                email,
                role: 'user',
                createdAt: new Date().toISOString()
            };
            
            users.push(newUser);
            writeJSON('users.json', users);
            
            sendResponse(res, 201, { 
                success: true, 
                user: { 
                    id: newUser.id, 
                    username: newUser.username, 
                    role: newUser.role,
                    email: newUser.email 
                } 
            });
        });
        return;
    }

    // Products routes
    if (pathname === '/api/products' && method === 'GET') {
        const products = readJSON('products.json');
        const categories = readJSON('categories.json');
        
        const productsWithCategories = products.map(product => ({
            ...product,
            category: categories.find(cat => cat.id === product.categoryId)
        }));
        
        sendResponse(res, 200, productsWithCategories);
        return;
    }

    if (pathname === '/api/products' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const productData = JSON.parse(body);
            const products = readJSON('products.json');
            
            const newProduct = {
                id: products.length + 1,
                ...productData,
                stats: { purchased: 0, favorited: 0 },
                discount: 0
            };
            
            products.push(newProduct);
            writeJSON('products.json', products);
            sendResponse(res, 201, newProduct);
        });
        return;
    }

    if (pathname.startsWith('/api/products/') && method === 'PUT') {
        const productId = parseInt(pathname.split('/')[3]);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const updateData = JSON.parse(body);
            const products = readJSON('products.json');
            const productIndex = products.findIndex(p => p.id === productId);
            
            if (productIndex !== -1) {
                products[productIndex] = { ...products[productIndex], ...updateData };
                writeJSON('products.json', products);
                sendResponse(res, 200, products[productIndex]);
            } else {
                sendResponse(res, 404, { message: 'Товар не найден' });
            }
        });
        return;
    }

    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
        const productId = parseInt(pathname.split('/')[3]);
        const products = readJSON('products.json');
        const filteredProducts = products.filter(p => p.id !== productId);
        
        if (filteredProducts.length < products.length) {
            writeJSON('products.json', filteredProducts);
            sendResponse(res, 200, { message: 'Товар удален' });
        } else {
            sendResponse(res, 404, { message: 'Товар не найден' });
        }
        return;
    }

    // Categories routes
    if (pathname === '/api/categories' && method === 'GET') {
        const categories = readJSON('categories.json');
        sendResponse(res, 200, categories);
        return;
    }

    if (pathname === '/api/categories' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { name } = JSON.parse(body);
            const categories = readJSON('categories.json');
            
            const newCategory = {
                id: categories.length + 1,
                name
            };
            
            categories.push(newCategory);
            writeJSON('categories.json', categories);
            sendResponse(res, 201, newCategory);
        });
        return;
    }

    if (pathname.startsWith('/api/categories/') && method === 'DELETE') {
        const categoryId = parseInt(pathname.split('/')[3]);
        const categories = readJSON('categories.json');
        const products = readJSON('products.json');
        
        const filteredCategories = categories.filter(c => c.id !== categoryId);
        const filteredProducts = products.filter(p => p.categoryId !== categoryId);
        
        writeJSON('categories.json', filteredCategories);
        writeJSON('products.json', filteredProducts);
        
        sendResponse(res, 200, { message: 'Категория и связанные товары удалены' });
        return;
    }

    // Orders routes
    if (pathname === '/api/orders' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const orderData = JSON.parse(body);
            const orders = readJSON('orders.json');
            const products = readJSON('products.json');
            
            const newOrder = {
                id: orders.length + 1,
                ...orderData,
                createdAt: new Date().toISOString(),
                status: 'completed'
            };
            
            // Update product stats
            orderData.items.forEach(item => {
                const productIndex = products.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    products[productIndex].stats.purchased += item.quantity;
                }
            });
            
            writeJSON('products.json', products);
            orders.push(newOrder);
            writeJSON('orders.json', orders);
            
            sendResponse(res, 201, newOrder);
        });
        return;
    }

    if (pathname === '/api/orders/user' && method === 'GET') {
        const userId = parseInt(parsedUrl.query.userId);
        const orders = readJSON('orders.json');
        const userOrders = orders.filter(order => order.userId === userId);
        sendResponse(res, 200, userOrders);
        return;
    }

    // Reviews routes
    if (pathname === '/api/reviews' && method === 'GET') {
        const reviews = readJSON('reviews.json');
        sendResponse(res, 200, reviews);
        return;
    }

    if (pathname === '/api/reviews' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const reviewData = JSON.parse(body);
            const reviews = readJSON('reviews.json');
            
            const newReview = {
                id: reviews.length + 1,
                ...reviewData,
                createdAt: new Date().toISOString(),
                adminReply: null
            };
            
            reviews.push(newReview);
            writeJSON('reviews.json', reviews);
            sendResponse(res, 201, newReview);
        });
        return;
    }

    if (pathname.startsWith('/api/reviews/') && method === 'PUT') {
        const reviewId = parseInt(pathname.split('/')[3]);
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { adminReply } = JSON.parse(body);
            const reviews = readJSON('reviews.json');
            const reviewIndex = reviews.findIndex(r => r.id === reviewId);
            
            if (reviewIndex !== -1) {
                reviews[reviewIndex].adminReply = adminReply;
                writeJSON('reviews.json', reviews);
                sendResponse(res, 200, reviews[reviewIndex]);
            } else {
                sendResponse(res, 404, { message: 'Отзыв не найден' });
            }
        });
        return;
    }

    // Stats route
    if (pathname === '/api/stats' && method === 'GET') {
        const products = readJSON('products.json');
        const orders = readJSON('orders.json');
        
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const topProducts = [...products]
            .sort((a, b) => b.stats.purchased - a.stats.purchased)
            .slice(0, 5);
        
        sendResponse(res, 200, {
            totalRevenue,
            totalOrders: orders.length,
            topProducts
        });
        return;
    }

    sendResponse(res, 404, { message: 'API endpoint not found' });
};

// Main server
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url.startsWith('/api')) {
        handleAPI(req, res);
    } else {
        serveStaticFile(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});