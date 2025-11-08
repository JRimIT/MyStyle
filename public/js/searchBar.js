document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('navbarSearch');
    
    // Handle search function for all pages
    async function handleSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        try {
            // Get current page path
            const currentPath = window.location.pathname;

            // Redirect to menu page with search query if not already there
            if (currentPath !== '/menu') {
                window.location.href = `/menu?search=${encodeURIComponent(searchTerm)}`;
                return;
            }

            // If already on menu page, filter products directly
            const productItems = document.querySelectorAll('.product-card');
            let hasResults = false;

            productItems.forEach(item => {
                const productName = item.querySelector('.product-name').textContent.toLowerCase();
                const shouldShow = productName.includes(searchTerm.toLowerCase());
                item.closest('.col-lg-3').style.display = shouldShow ? '' : 'none';
                if (shouldShow) hasResults = true;
            });

            // Show/hide no results message
            const noResults = document.getElementById('noResults');
            if (noResults) {
                noResults.style.display = hasResults ? 'none' : 'block';
            }

        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Handle search button click
    searchBtn.addEventListener('click', handleSearch);

    // Handle Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    // Check for search query parameter when loading menu page
    if (window.location.pathname === '/menu') {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        if (searchQuery) {
            searchInput.value = searchQuery;
            handleSearch();
        }
    }
});