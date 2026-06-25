// --- Cart functionality ---
let cart = [];
let total = 0;

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function openCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty. Add some items first!');
        return;
    }
    document.getElementById('checkoutModal').classList.add('open');
    document.getElementById('checkoutOverlay').style.display = 'block';
    document.getElementById('checkoutTotal').textContent = document.getElementById('cartTotal').textContent;
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('open');
    document.getElementById('checkoutOverlay').style.display = 'none';
}

function addToCart(name, price) {
    cart.push({ name, price });
    total += price;
    updateCartUI();
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent || btn.innerHTML;
    btn.innerHTML = '✓ Added!';
    btn.style.background = '#2d8f5c';
    btn.style.color = '#fff';
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
        btn.style.color = '';
    }, 1500);
}

function removeFromCart(index) {
    total -= cart[index].price;
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Your cart is empty.</p>';
        cartTotal.textContent = 'R 0.00';
        cartCount.textContent = '0';
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>R ${item.price.toFixed(2)} <button onclick="removeFromCart(${index})" style="background:none;border:none;color:#e87a20;cursor:pointer;margin-left:8px;font-size:1.2rem;">&times;</button></span>
            </div>
        `;
    });
    cartItems.innerHTML = html;
    cartTotal.textContent = `R ${total.toFixed(2)}`;
    cartCount.textContent = cart.length;
}

function processPayment(event) {
    event.preventDefault();
    const button = document.getElementById('payButton');
    const spinner = document.getElementById('spinner');
    const payText = document.getElementById('payText');

    spinner.style.display = 'inline-block';
    payText.textContent = 'Processing...';
    button.disabled = true;

    setTimeout(() => {
        spinner.style.display = 'none';
        payText.textContent = '✓ Payment Successful!';
        button.style.background = '#2d8f5c';
        button.style.color = '#fff';

        cart = [];
        total = 0;
        updateCartUI();
        closeCheckout();

        setTimeout(() => {
            payText.textContent = 'Pay Now';
            button.style.background = '';
            button.style.color = '';
            button.disabled = false;
            alert('Thank you for your order! You will receive a confirmation shortly.');
        }, 1500);
    }, 2000);
}

// --- Page functions ---
function openOrder() {
    document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' });
    // If on products page, scroll to grid
    if (window.location.pathname.includes('products.html')) {
        document.querySelector('.products-grid')?.scrollIntoView({ behavior: 'smooth' });
    }
}

function openParcel() {
    document.getElementById('parcels')?.scrollIntoView({ behavior: 'smooth' });
}

function openDriver() {
    window.location.href = 'driver.html';
}

function openPartner() {
    window.location.href = 'contact.html';
}

function openLogin() {
    alert('Sign in feature coming soon!');
}

// --- Auto-load cart on page load ---
document.addEventListener('DOMContentLoaded', function() {
    updateCartUI();
});
