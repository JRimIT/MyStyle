document.addEventListener('DOMContentLoaded', function() {
    const advancedSearchBtn = document.getElementById('navbarAdvancedSearch');
    const advancedSearchPanel = document.querySelector('.advanced-search-panel');
    const clearSearchBtn = document.getElementById('navbarClearSearch');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('navbarSearch');
    const applyFiltersBtn = document.getElementById('applyFilters');

    // Function to filter products
    function filterProducts(shouldClosePanel = false) {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedPriceRange = document.querySelector('input[name="priceRange"]:checked');
        const selectedSizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);
        
        // Get all product items from the Home page
        const productItems = document.querySelectorAll('#productGrid .product-item');
        let hasResults = false;

        productItems.forEach(item => {
            let shouldShow = true;

            // Filter by search term
            if (searchTerm) {
                const productName = item.querySelector('.card-title').textContent.toLowerCase();
                shouldShow = productName.includes(searchTerm);
            }

            // Filter by price range
            if (shouldShow && selectedPriceRange) {
                const productPrice = parseInt(item.querySelector('.card-text').textContent.replace(/\D/g, ''));
                const [minPrice, maxPrice] = selectedPriceRange.value.split('-').map(Number);
                shouldShow = productPrice >= minPrice && productPrice <= maxPrice;
            }

            // Filter by sizes
            if (shouldShow && selectedSizes.length > 0) {
                const productSizes = item.dataset.sizes ? item.dataset.sizes.split(',') : [];
                shouldShow = selectedSizes.some(size => productSizes.includes(size));
            }

            // Show/hide the item
            item.style.display = shouldShow ? '' : 'none';
            if (shouldShow) hasResults = true;
        });

        // Show/hide no results message
        const noResultsDiv = document.getElementById('noResults');
        if (noResultsDiv) {
            noResultsDiv.style.display = hasResults ? 'none' : 'block';
        }

        // Only close panel if explicitly requested (via Apply Filters button)
        if (shouldClosePanel) {
            advancedSearchPanel.style.display = 'none';
        }
    }

    // Toggle advanced search panel
    advancedSearchBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        advancedSearchPanel.style.display = advancedSearchPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        if (!advancedSearchPanel.contains(e.target) && e.target !== advancedSearchBtn) {
            advancedSearchPanel.style.display = 'none';
        }
    });

    // Prevent panel close when clicking inside
    advancedSearchPanel.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Clear all filters
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        document.querySelectorAll('input[name="priceRange"]').forEach(radio => radio.checked = false);
        document.querySelectorAll('input[name="sizes"]').forEach(cb => {
            cb.checked = false;
            cb.nextElementSibling.classList.remove('active');
        });
        filterProducts();
    });

    // Handle search input enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            filterProducts();
        }
    });

    // Handle search button click
    searchBtn.addEventListener('click', function() {
        filterProducts();
    });

    // Handle size button clicks
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });

    // Handle apply filters button
    applyFiltersBtn.addEventListener('click', function() {
        filterProducts(true); // Pass true to close the panel after applying filters
    });

    // Handle price range changes
    document.querySelectorAll('input[name="priceRange"]').forEach(radio => {
        radio.addEventListener('change', function() {
            filterProducts(false); // Don't close panel on price change
        });
    });

    // Handle size changes
    document.querySelectorAll('input[name="sizes"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            filterProducts(false); // Don't close panel on size change
        });
    });
});