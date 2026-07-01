// ===== FIREBASE AUTH =====
const auth = firebase.auth();
const db = firebase.firestore();

// ===== RESTAURANTS DATA =====
const restaurants = [
    {
        id: 1,
        name: "Hello Tomato",
        cuisine: "Pizza & Pasta",
        icon: "fa-pizza-slice",
        price: 85.00,
        rating: 4.5,
        deliveryTime: "30-45 min",
        featured: true
    },
    {
        id: 2,
        name: "Bento",
        cuisine: "Asian Fusion",
        icon: "fa-fish",
        price: 95.00,
        rating: 4.7,
        deliveryTime: "25-40 min",
        featured: true
    },
    {
        id: 3,
        name: "Afrikoa",
        cuisine: "African Cuisine",
        icon: "fa-drumstick-bite",
        price: 75.00,
        rating: 4.3,
        deliveryTime: "35-50 min",
        featured: true
    },
    {
        id: 4,
        name: "Cinnabon",
        cuisine: "Bakery & Sweets",
        icon: "fa-cookie-bite",
        price: 65.00,
        rating: 4.6,
        deliveryTime: "20-30 min",
        featured: true
    },
    {
        id: 5,
        name: "Braai Republic",
        cuisine: "Traditional Braai",
        icon: "fa-fire",
        price: 110.00,
        rating: 4.8,
        deliveryTime: "40-55 min",
        featured: true
    },
    {
        id: 6,
        name: "Cape Malay",
        cuisine: "Malay Cuisine",
        icon: "fa-pepper-hot",
        price: 90.00,
        rating: 4.4,
        deliveryTime: "30-45 min",
        featured: true
    },
    {
        id: 7,
        name: "Sushi & Co",
        cuisine: "Japanese",
        icon: "fa-utensils",
        price: 120.00,
        rating: 4.9,
        deliveryTime: "25-35 min",
        featured: false
    },
    {
        id: 8,
        name: "Curry House",
        cuisine: "Indian",
        icon: "fa-pepper-hot",
        price: 80.00,
        rating: 4.2,
        deliveryTime: "35-50 min",
        featured: false
    }
];

// ===== STATE MANAGEMENT =====
let cart = [];
let favorites = JSON.parse(localStorage.getItem('culturei_favorites')) || [];
let orderHistory = JSON.parse(localStorage.getItem('culturei_orders')) || [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;

// ===== DOM ELEMENTS =====
const cartCount = document.getElementById('cartCount');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');

// ============================================
// GOOGLE SIGN-IN (ADDED - NO STYLES CHANGED)
// ============================================

function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            currentUser = user;
            showNotification(`✅ Welcome, ${user.displayName || user.email}!`);
            
            // Save to Firestore
            db.collection('users').doc(user.uid).set({
                email: user.email,
                name: user.displayName || 'User',
                photoURL: user.photoURL || '',
                lastLogin: new Date()
            }, { merge: true });
            
            updateAuthUI();
            
            // Redirect if on signin page
            if (window.location.pathname.includes('signin.html')) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        })
        .catch((error) => {
            let message = '❌ Error: ' + error.message;
            if (error.code === 'auth/popup-closed-by-user') {
                message = '❌ Sign-in cancelled. Please try again.';
            }
            showNotification(message);
        });
}

// Make Google Sign-In globally available
window.googleSignIn = googleSignIn;

// ===== AUTHENTICATION FUNCTIONS =====
function openLogin() {
    // Show login options
    const choice = confirm("Click OK for Email/Password or Cancel for Google Sign-In");
    
    if (!choice) {
        // Google Sign-In
        googleSignIn();
        return;
    }
    
    const email = prompt("Enter your email:");
    if (!email) return;
    
    const password = prompt("Enter your password (min 6 chars):");
    if (!password) return;
    
    const action = confirm("Click OK to Sign Up or Cancel to Sign In");
    
    if (action) {
        // Sign Up
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                showNotification('✅ Account created! Welcome to Culturei! 🎉');
                updateAuthUI();
            })
            .catch((error) => {
                showNotification(`❌ Sign Up Error: ${error.message}`);
            });
    } else {
        // Sign In
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                currentUser = userCredential.user;
                showNotification('✅ Welcome back! 👋');
                updateAuthUI();
            })
            .catch((error) => {
                showNotification(`❌ Sign In Error: ${error.message}`);
            });
    }
}

function signOut() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            showNotification('👋 Signed out successfully');
            updateAuthUI();
        })
        .catch((error) => {
            showNotification(`❌ Error: ${error.message}`);
        });
}

function updateAuthUI() {
    const signInBtn = document.querySelector('.btn-outline-light');
    const googleBtn = document.getElementById('googleSignInBtn');
    
    if (signInBtn) {
        if (currentUser) {
            signInBtn.innerHTML = `👤 ${currentUser.email}`;
            signInBtn.onclick = signOut;
        } else {
            signInBtn.innerHTML = 'Sign In';
            signInBtn.onclick = openLogin;
        }
    }
    
    // Update Google button if it exists
    if (googleBtn) {
        if (currentUser) {
            googleBtn.innerHTML = `✅ ${currentUser.displayName || currentUser.email}`;
            googleBtn.disabled = true;
            googleBtn.style.opacity = '0.7';
        } else {
            googleBtn.innerHTML = '🔵 Sign in with Google';
            googleBtn.disabled = false;
            googleBtn.style.opacity = '1';
        }
    }
}

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showNotification(`👋 Hello ${user.displayName || user.email || 'User'}!`);
    } else {
        currentUser = null;
    }
    updateAuthUI();
});

// ===== RENDER RESTAURANTS =====
function renderRestaurants() {
    const grid = document.getElementById('menuGrid') || document.getElementById('restaurantGrid');
    if (!grid) return;

    let filteredRestaurants = restaurants;

    // Apply search filter
    if (searchQuery) {
        filteredRestaurants = filteredRestaurants.filter(r => 
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Apply favorites filter
    if (currentFilter === 'favorites') {
        filteredRestaurants = filteredRestaurants.filter(r => favorites.includes(r.id));
    }

    if (filteredRestaurants.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted);"></i>
                <p style="color: var(--text-muted);">No restaurants found. Try a different search!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredRestaurants.map(restaurant => `
        <div class="restaurant-card" data-id="${restaurant.id}">
            <div class="icon"><i class="fas ${restaurant.icon}"></i></div>
            <h4>${restaurant.name}</h4>
            <p>${restaurant.cuisine}</p>
            <div class="restaurant-rating">
                <i class="fas fa-star" style="color: #f5c542;"></i>
                <span>${restaurant.rating}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">(${restaurant.deliveryTime})</span>
            </div>
            <span class="price">R${restaurant.price.toFixed(2)}</span>
            <div class="restaurant-actions">
                <button class="btn-add" onclick="addToCart(${restaurant.id})">
                    <i class="fas fa-plus"></i> Add
                </button>
                <button class="btn-favorite ${favorites.includes(restaurant.id) ? 'favorited' : ''}" 
                        onclick="toggleFavorite(${restaurant.id})">
                    ${favorites.includes(restaurant.id) ? '⭐' : '☆'}
                </button>
            </div>
        </div>
    `).join('');
}

// ===== ADD TO CART =====
function addToCart(restaurantId) {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    const existingItem = cart.find(item => item.id === restaurantId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...restaurant,
            quantity: 1
        });
    }
    
    updateCartUI();
    updateFloatingCartBadge();
    showNotification(`${restaurant.name} added to cart! 🛒`);
}

// ===== TOGGLE FAVORITE =====
function toggleFavorite(restaurantId) {
    const index = favorites.indexOf(restaurantId);
    if (index > -1) {
        favorites.splice(index, 1);
        showNotification('Removed from favorites 💔');
    } else {
        favorites.push(restaurantId);
        showNotification('Added to favorites ⭐');
    }
    localStorage.setItem('culturei_favorites', JSON.stringify(favorites));
    renderRestaurants();
    updateStats();
}

// ===== UPDATE CART UI =====
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartCount) cartCount.textContent = totalItems;
    if (cartTotal) cartTotal.textContent = `R${totalPrice.toFixed(2)}`;

    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>R${item.price.toFixed(2)} × ${item.quantity}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button onclick="updateQuantity(${item.id}, -1)">−</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ===== UPDATE QUANTITY =====
function updateQuantity(restaurantId, change) {
    const item = cart.find(item => item.id === restaurantId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(restaurantId);
        } else {
            updateCartUI();
            updateFloatingCartBadge();
        }
    }
}

// ===== REMOVE FROM CART =====
function removeFromCart(restaurantId) {
    cart = cart.filter(item => item.id !== restaurantId);
    updateCartUI();
    updateFloatingCartBadge();
    showNotification('Item removed from cart');
}

// ===== TOGGLE CART =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }
}

// ===== CHECKOUT =====
function openCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty! 🛒');
        return;
    }
    document.getElementById('checkoutModal').classList.add('open');
    document.getElementById('checkoutOverlay').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('open');
    document.getElementById('checkoutOverlay').classList.remove('active');
}

function processCheckout(event) {
    event.preventDefault();
    const spinner = document.getElementById('spinner');
    const payText = document.getElementById('payText');
    
    spinner.style.display = 'inline-block';
    payText.textContent = 'Processing...';

    setTimeout(() => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const order = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            total: total,
            deliveryType: document.getElementById('deliveryType').value,
            address: document.getElementById('deliveryAddress').value
        };

        orderHistory.unshift(order);
        localStorage.setItem('culturei_orders', JSON.stringify(orderHistory));
        
        cart = [];
        updateCartUI();
        updateFloatingCartBadge();
        renderOrderHistory();
        updateStats();
        
        spinner.style.display = 'none';
        payText.textContent = 'Pay Now';
        closeCheckout();
        showNotification(`✅ Order placed! Total: R${total.toFixed(2)}`);
        document.getElementById('checkoutForm').reset();
    }, 2000);
}

// ===== RENDER ORDER HISTORY =====
function renderOrderHistory() {
    const historyList = document.getElementById('orderHistoryList');
    if (!historyList) return;

    if (orderHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-orders">No orders yet. Start exploring!</p>';
        return;
    }

    historyList.innerHTML = orderHistory.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-date">📅 ${order.date}</span>
                <span class="order-total">R${order.total.toFixed(2)}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `${item.name} (${item.quantity}x)`).join(' • ')}
            </div>
            ${order.deliveryType ? `<p style="color: var(--text-muted); font-size: 0.85rem;">Delivery: ${order.deliveryType}</p>` : ''}
        </div>
    `).join('');
}

// ===== UPDATE STATS =====
function updateStats() {
    const favoriteCount = document.getElementById('favoriteCount');
    const orderCount = document.getElementById('orderCount');
    const aboutFavorites = document.getElementById('aboutFavorites');
    const aboutOrders = document.getElementById('aboutOrders');

    if (favoriteCount) favoriteCount.textContent = favorites.length;
    if (orderCount) orderCount.textContent = orderHistory.length;
    if (aboutFavorites) aboutFavorites.textContent = favorites.length;
    if (aboutOrders) aboutOrders.textContent = orderHistory.length;
}

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        searchQuery = this.value;
        if (clearSearch) {
            clearSearch.classList.toggle('visible', this.value.length > 0);
        }
        renderRestaurants();
    });

    if (clearSearch) {
        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            searchQuery = '';
            this.classList.remove('visible');
            renderRestaurants();
        });
    }
}

// ===== FILTER TABS =====
function setupFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderRestaurants();
        });
    });
}

// ===== DARK MODE TOGGLE =====
function setupDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;

    // Check saved preference
    if (localStorage.getItem('culturei_dark_mode') === 'true') {
        document.body.classList.add('light-mode');
        toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    toggle.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('culturei_dark_mode', isLight);
        this.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: var(--accent-orange);
        color: var(--primary-black);
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        max-width: 400px;
    `;
    document.body.appendChild(toast);

    // Add animation style if not exists
    if (!document.getElementById('notification-style')) {
        const style = document.createElement('style');
        style.id = 'notification-style';
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(20px); }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== GOOGLE MAPS INIT =====
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // South Africa center coordinates
    const southAfrica = { lat: -28.4793, lng: 24.6722 };
    
    const map = new google.maps.Map(mapElement, {
        zoom: 5,
        center: southAfrica,
        styles: [
            {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#ffffff" }]
            },
            {
                featureType: "all",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#0d0d0d" }]
            },
            {
                featureType: "all",
                elementType: "all",
                stylers: [{ saturation: -100 }]
            }
        ]
    });

    // Add markers for major cities
    const cities = [
        { lat: -33.9249, lng: 18.4241, name: "Cape Town" },
        { lat: -26.2041, lng: 28.0473, name: "Johannesburg" },
        { lat: -29.8587, lng: 31.0218, name: "Durban" },
        { lat: -25.7479, lng: 28.2293, name: "Pretoria" },
        { lat: -33.9593, lng: 25.5948, name: "Gqeberha" },
        { lat: -26.2708, lng: 27.9318, name: "Soweto" }
    ];

    cities.forEach(city => {
        new google.maps.Marker({
            position: { lat: city.lat, lng: city.lng },
            map: map,
            title: city.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#e87a20',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            }
        });
    });
}

// ===== TRACK ORDER =====
function trackOrder() {
    const code = document.getElementById('trackingCode')?.value;
    const result = document.getElementById('tracking-result');
    
    if (!code) {
        result.innerHTML = '<p style="color: var(--accent-orange);">⚠️ Please enter a tracking code</p>';
        return;
    }
    
    result.innerHTML = `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-card); border-radius: 10px; border-left: 4px solid var(--accent-orange);">
            <p style="font-weight: 600;">📦 Tracking #${code}</p>
            <p style="color: var(--text-muted);">Status: <span style="color: var(--accent-orange);">In Transit</span></p>
            <p style="color: var(--text-muted);">Estimated delivery: 30-45 min</p>
            <p style="color: var(--text-muted); font-size: 0.8rem;">📍 Last update: Cape Town, 10:32 AM</p>
        </div>
    `;
}

// ===== DRIVER APPLICATION =====
function processDriverApplication(event) {
    event.preventDefault();
    const name = document.getElementById('driverName')?.value;
    const phone = document.getElementById('driverPhone')?.value;
    const email = document.getElementById('driverEmail')?.value;
    const city = document.getElementById('driverCity')?.value;
    const vehicle = document.getElementById('vehicleType')?.value;

    showNotification(`✅ Application submitted, ${name}! We'll contact you at ${phone}.`);

    // Reset form
    document.getElementById('driverForm')?.reset();
}

// ===== OTHER FUNCTIONS =====
function openDriver() {
    window.location.href = '/drivers.html';
}

function openOrder() {
    window.location.href = '/restaurants.html';
}

function openParcel() {
    showNotification('📦 Parcel delivery feature coming soon!');
}

function openPartner() {
    showNotification('🤝 Partnership opportunities coming soon!');
}

// ==========================================
// FLOATING CART - BOTTOM CENTER
// ==========================================

function createFloatingCart() {
    if (document.querySelector('.floating-cart')) return;
    const count = document.getElementById('cartCount')?.textContent || '0';
    const btn = document.createElement('button');
    btn.className = 'floating-cart pulse';
    btn.innerHTML = `
        <i class="fas fa-shopping-bag"></i>
        Cart
        <span class="cart-badge">${count}</span>
    `;
    btn.onclick = function() { toggleCart(); };
    document.body.appendChild(btn);
}

function updateFloatingCartBadge() {
    const badge = document.querySelector('.floating-cart .cart-badge');
    const count = document.getElementById('cartCount')?.textContent || '0';
    if (badge) badge.textContent = count;
}

// ==========================================

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    renderRestaurants();
    renderOrderHistory();
    updateStats();
    updateCartUI();
    setupSearch();
    setupFilters();
    setupDarkMode();
    updateAuthUI();
    createFloatingCart();

    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav ul li a').forEach(link => {
        if (link.getAttribute('href') === currentPage || 
            link.getAttribute('href') === '/' + currentPage) {
            link.classList.add('active');
        }
    });
});

// ===== EXPOSE FUNCTIONS FOR HTML =====
window.addToCart = addToCart;
window.toggleFavorite = toggleFavorite;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
window.processCheckout = processCheckout;
window.processDriverApplication = processDriverApplication;
window.openLogin = openLogin;
window.openDriver = openDriver;
window.openOrder = openOrder;
window.openParcel = openParcel;
window.openPartner = openPartner;
window.initMap = initMap;
window.trackOrder = trackOrder;
window.signOut = signOut;
window.createFloatingCart = createFloatingCart;
window.updateFloatingCartBadge = updateFloatingCartBadge;
window.googleSignIn = googleSignIn;
