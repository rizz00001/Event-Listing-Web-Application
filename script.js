// ===================================
// Configuration
// ===================================
const API_KEY = 'wBMU6OeHHfpQkWCU7MYuTFPZA7YJ0TON'; // Get from developer.ticketmaster.com
const API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// ===================================
// State Management
// ===================================
let currentPage = 0;
let currentKeyword = '';
let currentCity = '';
let currentCategory = '';
let currentSort = 'relevance,desc';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let totalResults = 0;

// ===================================
// DOM Elements
// ===================================
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const cityInput = document.getElementById('cityInput');
const eventsContainer = document.getElementById('eventsContainer');
const loaderContainer = document.getElementById('loaderContainer');
const pagination = document.getElementById('pagination');
const resultsCount = document.getElementById('resultsCount');
const modal = document.getElementById('eventModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortBy');
const backToTop = document.getElementById('backToTop');
const navLinks = document.querySelectorAll('.nav-link');
const favoritesContainer = document.getElementById('favoritesContainer');

// ===================================
// Event Listeners
// ===================================
// Search functionality
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.dataset.category;
        currentPage = 0;
        fetchEvents();
    });
});

// Sort select
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value === 'date' ? 'date,asc' : 
                  e.target.value === 'name' ? 'name,asc' : 'relevance,desc';
    currentPage = 0;
    fetchEvents();
});

// Modal close
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// Navigation links
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
        
        if (targetId === 'favorites') {
            displayFavorites();
        }
    });
});

// Back to top button
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Show/hide back to top button on scroll
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
    
    // Update active nav link based on scroll position
    updateActiveNavOnScroll();
});

// ===================================
// Main Functions
// ===================================

function handleSearch() {
    currentKeyword = searchInput.value.trim();
    currentCity = cityInput.value.trim();
    currentPage = 0;
    fetchEvents();
    
    // Scroll to events section
    document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
}

async function fetchEvents() {
    showLoader(true);
    
    try {
        let url = `${API_BASE_URL}/events.json?apikey=${API_KEY}&size=20&page=${currentPage}&sort=${currentSort}`;
        
        if (currentKeyword) url += `&keyword=${encodeURIComponent(currentKeyword)}`;
        if (currentCity) url += `&city=${encodeURIComponent(currentCity)}`;
        if (currentCategory) url += `&classificationName=${currentCategory}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        
        if (data._embedded && data._embedded.events) {
            totalResults = data.page.totalElements;
            displayEvents(data._embedded.events);
            createPagination(data.page);
            updateResultsCount();
        } else {
            eventsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                    <div style="font-size: 4em; margin-bottom: 20px;">😔</div>
                    <h3 style="font-size: 2em; margin-bottom: 10px;">No events found</h3>
                    <p style="font-size: 1.2em; color: #666;">Try different search terms or filters</p>
                </div>
            `;
            pagination.innerHTML = '';
            resultsCount.textContent = '';
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        eventsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                <h3 style="font-size: 2em; margin-bottom: 10px; color: #e74c3c;">Error loading events</h3>
                <p style="font-size: 1.2em; color: #666;">Please check your API key and try again</p>
            </div>
        `;
        pagination.innerHTML = '';
        resultsCount.textContent = '';
    } finally {
        showLoader(false);
    }
}

function displayEvents(events) {
    eventsContainer.innerHTML = '';
    
    events.forEach((event, index) => {
        const eventCard = createEventCard(event, index);
        eventsContainer.appendChild(eventCard);
    });
}

function createEventCard(event, index) {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const image = event.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image';
    const name = event.name || 'Untitled Event';
    const venue = event._embedded?.venues?.[0]?.name || 'Venue TBA';
    const city = event._embedded?.venues?.[0]?.city?.name || 'City TBA';
    const state = event._embedded?.venues?.[0]?.state?.stateCode || '';
    const date = event.dates?.start?.localDate || 'Date TBA';
    const time = event.dates?.start?.localTime || '';
    const category = event.classifications?.[0]?.segment?.name || 'General';
    const priceRange = event.priceRanges ? 
        `$${event.priceRanges[0].min} - $${event.priceRanges[0].max}` : 'Price TBA';
    
    const isFavorite = favorites.includes(event.id);
    
    card.innerHTML = `
        <div class="event-image-container">
            <img src="${image}" alt="${name}" class="event-image" loading="lazy">
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${event.id}', event)">
                ${isFavorite ? '❤️' : '🤍'}
            </button>
        </div>
        <div class="event-content">
            <span class="event-category">${category}</span>
            <h3 class="event-title">${name}</h3>
            <div class="event-details">
                <div class="event-detail-item">
                    <span class="detail-icon">📍</span>
                    <span>${venue}, ${city}${state ? ', ' + state : ''}</span>
                </div>
                <div class="event-detail-item">
                    <span class="detail-icon">📅</span>
                    <span>${formatDate(date)} ${time ? `• ${formatTime(time)}` : ''}</span>
                </div>
                <div class="event-detail-item">
                    <span class="price-badge">💰 ${priceRange}</span>
                </div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-btn')) {
            showEventDetails(event);
        }
    });
    
    return card;
}

function showEventDetails(event) {
    const venue = event._embedded?.venues?.[0];
    const attractions = event._embedded?.attractions || [];
    const image = event.images?.[0]?.url || 'https://via.placeholder.com/800x400?text=No+Image';
    
    modalBody.innerHTML = `
        <img src="${image}" alt="${event.name}" class="modal-image">
        <h2 class="modal-title">${event.name}</h2>
        
        <div class="modal-details">
            <div class="modal-detail-item">
                <strong>📅 Date & Time</strong>
                ${formatDate(event.dates?.start?.localDate)} 
                ${event.dates?.start?.localTime ? `at ${formatTime(event.dates.start.localTime)}` : ''}
                ${event.dates?.start?.dateTBD ? '<br><em>Date to be determined</em>' : ''}
            </div>
            
            <div class="modal-detail-item">
                <strong>📍 Venue</strong>
                ${venue?.name || 'TBA'}<br>
                ${venue?.address?.line1 ? venue.address.line1 + '<br>' : ''}
                ${venue?.city?.name || ''}, ${venue?.state?.stateCode || ''} ${venue?.postalCode || ''}
            </div>
            
            ${event.priceRanges ? `
                <div class="modal-detail-item">
                    <strong>💰 Price Range</strong>
                    $${event.priceRanges[0].min} - $${event.priceRanges[0].max} ${event.priceRanges[0].currency}
                </div>
            ` : ''}
            
            ${attractions.length > 0 ? `
                <div class="modal-detail-item">
                    <strong>🎭 Artists/Teams</strong>
                    ${attractions.map(a => a.name).join(', ')}
                </div>
            ` : ''}
            
            ${event.classifications?.[0] ? `
                <div class="modal-detail-item">
                    <strong>🏷️ Category</strong>
                    ${event.classifications[0].segment?.name || ''} 
                    ${event.classifications[0].genre?.name ? '• ' + event.classifications[0].genre.name : ''}
                    ${event.classifications[0].subGenre?.name ? '• ' + event.classifications[0].subGenre.name : ''}
                </div>
            ` : ''}
            
            ${event.info ? `
                <div class="modal-detail-item">
                    <strong>ℹ️ Event Information</strong>
                    ${event.info}
                </div>
            ` : ''}
            
            ${event.pleaseNote ? `
                <div class="modal-info-box">
                    <strong>⚠️ Please Note</strong>
                    ${event.pleaseNote}
                </div>
            ` : ''}
            
            ${event.accessibility ? `
                <div class="modal-detail-item">
                    <strong>♿ Accessibility</strong>
                    ${event.accessibility.info || 'Accessible seating available'}
                </div>
            ` : ''}
        </div>
        
        <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="ticket-btn">
            🎫 Buy Tickets on Ticketmaster
        </a>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function createPagination(pageInfo) {
    pagination.innerHTML = '';
    
    const totalPages = pageInfo.totalPages;
    const currentPageNum = pageInfo.number;
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '← Prev';
    prevBtn.disabled = currentPageNum === 0;
    prevBtn.onclick = () => {
        currentPage = currentPageNum - 1;
        fetchEvents();
        document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
    };
    pagination.appendChild(prevBtn);
    
    // Page numbers
    const startPage = Math.max(0, currentPageNum - 2);
    const endPage = Math.min(totalPages, currentPageNum + 3);
    
    if (startPage > 0) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => {
            currentPage = 0;
            fetchEvents();
            document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
        };
        pagination.appendChild(firstBtn);
        
        if (startPage > 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 10px';
            pagination.appendChild(dots);
        }
    }
    
    for (let i = startPage; i < endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i + 1;
        pageBtn.className = i === currentPageNum ? 'active' : '';
        pageBtn.onclick = () => {
            currentPage = i;
            fetchEvents();
            document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
        };
        pagination.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 10px';
            pagination.appendChild(dots);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => {
            currentPage = totalPages - 1;
            fetchEvents();
            document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
        };
        pagination.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next →';
    nextBtn.disabled = currentPageNum >= totalPages - 1;
    nextBtn.onclick = () => {
        currentPage = currentPageNum + 1;
        fetchEvents();
        document.getElementById('events').scrollIntoView({ behavior: 'smooth' });
    };
    pagination.appendChild(nextBtn);
}

function toggleFavorite(eventId, event) {
    event.stopPropagation();
    
    const button = event.target;
    
    if (favorites.includes(eventId)) {
        favorites = favorites.filter(id => id !== eventId);
        button.textContent = '🤍';
        button.classList.remove('active');
    } else {
        favorites.push(eventId);
        button.textContent = '❤️';
        button.classList.add('active');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update favorites section if it's currently visible
    const favoritesSection = document.getElementById('favorites');
    if (isElementInViewport(favoritesSection)) {
        displayFavorites();
    }
}

async function displayFavorites() {
    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="empty-favorites">
                <div class="empty-icon">💝</div>
                <h3>No favorites yet!</h3>
                <p>Click the heart icon on events to save them here.</p>
            </div>
        `;
        return;
    }
    
    favoritesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="loader"></div>
            <p style="margin-top: 20px; color: #666;">Loading your favorites...</p>
        </div>
    `;
    
    try {
        const eventPromises = favorites.map(id => 
            fetch(`${API_BASE_URL}/events/${id}.json?apikey=${API_KEY}`)
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
        );
        
        const events = await Promise.all(eventPromises);
        const validEvents = events.filter(e => e !== null);
        
        favoritesContainer.innerHTML = '';
        
        if (validEvents.length === 0) {
            favoritesContainer.innerHTML = `
                <div class="empty-favorites">
                    <div class="empty-icon">😔</div>
                    <h3>Couldn't load favorites</h3>
                    <p>Some events may no longer be available.</p>
                </div>
            `;
            return;
        }
        
        validEvents.forEach((event, index) => {
            const card = createEventCard(event, index);
            favoritesContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading favorites:', error);
        favoritesContainer.innerHTML = `
            <div class="empty-favorites">
                <div class="empty-icon">⚠️</div>
                <h3>Error loading favorites</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

// ===================================
// Utility Functions
// ===================================

function formatDate(dateString) {
    if (!dateString) return 'Date TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function showLoader(show) {
    loaderContainer.style.display = show ? 'block' : 'none';
}

function updateResultsCount() {
    if (totalResults > 0) {
        resultsCount.textContent = `Found ${totalResults.toLocaleString()} events`;
    } else {
        resultsCount.textContent = '';
    }
}

function updateActiveNavOnScroll() {
    const sections = ['events', 'categories', 'favorites'];
    const scrollPosition = window.scrollY + 100;
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        }
    });
}

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
    
    // Load favorites on page load if section is visible
    const favoritesSection = document.getElementById('favorites');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                displayFavorites();
            }
        });
    });
    observer.observe(favoritesSection);
});

// Prevent animations from triggering on page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
