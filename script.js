// Sample data for Instagram posts
const samplePosts = [
    { id: 1, status: 'pending', title: 'Post 1', scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000) }, // 2 hours
    { id: 2, status: 'published', title: 'Post 2', publishedTime: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 3, status: 'pending', title: 'Post 3', scheduledTime: new Date(Date.now() + 5 * 60 * 60 * 1000) }, // 5 hours
    { id: 4, status: 'published', title: 'Post 4', publishedTime: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { id: 5, status: 'pending', title: 'Post 5', scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 1 day
    { id: 6, status: 'published', title: 'Post 6', publishedTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { id: 7, status: 'pending', title: 'Post 7', scheduledTime: new Date(Date.now() + 30 * 60 * 1000) }, // 30 minutes
    { id: 8, status: 'published', title: 'Post 8', publishedTime: new Date(Date.now() - 6 * 60 * 60 * 1000) },
];

let currentFilter = 'all';
let countdownIntervals = {};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    renderCards();
    setupEventListeners();
    startCountdownTimers();
});

// Setup event listeners
function setupEventListeners() {
    // Filter dropdown
    const filterSelect = document.querySelector('.filter-select');
    filterSelect.addEventListener('change', function(e) {
        currentFilter = e.target.value;
        renderCards();
    });

    // Refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.addEventListener('click', function() {
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
        renderCards();
    });

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Action buttons
    const primaryBtn = document.querySelector('.action-btn.primary');
    primaryBtn.addEventListener('click', function() {
        showNotification('Nueva publicación creada', 'success');
    });

    const secondaryBtn = document.querySelector('.action-btn.secondary');
    secondaryBtn.addEventListener('click', function() {
        showNotification('Sincronizando datos...', 'info');
    });
}

// Render cards based on current filter
function renderCards() {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';

    // Clear existing countdown intervals
    Object.values(countdownIntervals).forEach(interval => clearInterval(interval));
    countdownIntervals = {};

    // Filter posts
    let filteredPosts = samplePosts;
    if (currentFilter === 'pending') {
        filteredPosts = samplePosts.filter(post => post.status === 'pending');
    } else if (currentFilter === 'published') {
        filteredPosts = samplePosts.filter(post => post.status === 'published');
    }

    // Create cards
    filteredPosts.forEach(post => {
        const card = createCard(post);
        container.appendChild(card);
    });

    // Start countdown timers for pending posts
    startCountdownTimers();
}

// Create a card element
function createCard(post) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.postId = post.id;

    const statusClass = post.status === 'pending' ? 'pending' : 'published';
    const statusText = post.status === 'pending' ? 'POR PUBLICAR' : 'PUBLICADO';
    const icon = post.status === 'pending' ? '⏰' : '✅';

    card.innerHTML = `
        <div class="card-icon">${icon}</div>
        <div class="card-status ${statusClass}">${statusText}</div>
        <div class="card-title">${post.title}</div>
        ${post.status === 'pending' ? 
            `<div class="card-countdown" data-post-id="${post.id}">Calculando...</div>` : 
            `<div class="card-meta">Publicado</div>`
        }
    `;

    // Add click event
    card.addEventListener('click', function() {
        showNotification(`Seleccionado: ${post.title}`, 'info');
    });

    return card;
}

// Start countdown timers for pending posts
function startCountdownTimers() {
    const pendingPosts = samplePosts.filter(post => post.status === 'pending');
    
    pendingPosts.forEach(post => {
        updateCountdown(post);
        
        // Update every second
        const interval = setInterval(() => {
            updateCountdown(post);
        }, 1000);
        
        countdownIntervals[post.id] = interval;
    });
}

// Update countdown for a specific post
function updateCountdown(post) {
    const countdownElement = document.querySelector(`.card-countdown[data-post-id="${post.id}"]`);
    if (!countdownElement) return;

    const now = new Date();
    const scheduledTime = new Date(post.scheduledTime);
    const timeDiff = scheduledTime - now;

    if (timeDiff <= 0) {
        countdownElement.textContent = 'Publicando...';
        clearInterval(countdownIntervals[post.id]);
        
        // Update post status
        post.status = 'published';
        setTimeout(() => {
            renderCards();
            showNotification(`${post.title} ha sido publicado`, 'success');
        }, 2000);
        return;
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    countdownElement.innerHTML = `Faltan: <strong>${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</strong>`;
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '1000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px'
    });

    // Set background color based on type
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        info: '#3498db',
        warning: '#f39c12'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

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
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Add more posts dynamically (for demonstration)
function addRandomPost() {
    const newPost = {
        id: samplePosts.length + 1,
        status: Math.random() > 0.5 ? 'pending' : 'published',
        title: `Post ${samplePosts.length + 1}`,
        scheduledTime: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000)
    };
    
    samplePosts.push(newPost);
    renderCards();
    showNotification('Nueva publicación agregada', 'success');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N: New post
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addRandomPost();
    }
    
    // Ctrl/Cmd + R: Refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        renderCards();
        showNotification('Dashboard actualizado', 'info');
    }
    
    // Ctrl/Cmd + 1-3: Filters
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const filters = ['all', 'pending', 'published'];
        const filterIndex = parseInt(e.key) - 1;
        currentFilter = filters[filterIndex];
        document.querySelector('.filter-select').value = currentFilter;
        renderCards();
    }
});
