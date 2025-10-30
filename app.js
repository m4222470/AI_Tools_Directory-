// =============================================
// 🔑 وظائف Firebase Authentication (للدخول بجوجل)
// تم التعديل على دالة signInWithGoogle لتستخدم signInWithRedirect
// =============================================

// يجب أن يكون 'auth' مُعرّفاً في index.html، لذلك نستخدمه هنا مباشرةً.
// لضمان عمله، تأكد من وضع كود تهيئة Firebase قبل استدعاء app.js في index.html.

/**
 * تسجيل الدخول باستخدام Google.
 */
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // ***************************************************************
    // *** التعديل الرئيسي: استخدام signInWithRedirect لحل مشكلة الحالة ***
    // ***************************************************************
    auth.signInWithRedirect(provider)
        .then(() => {
            // هذا الجزء لا يُنفذ عادةً، onAuthStateChanged هي التي تلتقط المستخدم
            console.log("بدء عملية إعادة التوجيه لتسجيل الدخول...");
        })
        .catch((error) => {
            // فشل تسجيل الدخول
            console.error("خطأ في التسجيل:", error);
            // نفترض أن Swal.fire متاح من خلال SweetAlert2
            if (typeof Swal !== 'undefined') {
                Swal.fire('خطأ!', `فشل تسجيل الدخول: ${error.message}`, 'error');
            }
        });
}

/**
 * تسجيل الخروج.
 */
function signOutUser() {
    auth.signOut()
        .then(() => {
            console.log("تم تسجيل الخروج بنجاح.");
            // إعادة تحميل الصفحة لتعود إلى حالة ما قبل تسجيل الدخول
            window.location.reload(); 
        })
        .catch((error) => {
            console.error("خطأ في تسجيل الخروج:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire('خطأ!', 'فشل تسجيل الخروج.', 'error');
            }
        });
}


// =============================================
// 🔧 APP HELPER CLASS - (الكود المُعدل)
// ... (باقي كلاس AppHelpers كما هو)
// =============================================
class AppHelpers {
    constructor() {
        this.isLoading = false;
        this.tools = [];
        this.categoriesData = []; 
        this.filteredTools = [];
        this.comparisonTools = new Set();
        this.bookmarkedTools = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentView = 'grid';
        this.isAdmin = false;
        this.isUserLoggedIn = false; // متغير جديد لحالة تسجيل الدخول
        this.debouncedSearch = this.debounce(() => this.applyFilters(), 300);
    }
    
    // *****************************************************************
    // *** دالة تهيئة AppHelpers الجديدة (بقي الكود كما هو) ***
    // *****************************************************************
    initAppContent() {
        window.aiToolsApp = this;
        console.log('✅ App helpers initialized');
        
        this.loadTools(); 
        this.setupEventListeners();
        this.setupComparison();
        this.loadBookmarks();
        this.checkAdminMode();
    }


    // =============================================
    // 💡 دالة جلب البيانات غير المتزامنة (بقي الكود كما هو)
    // =============================================
    async loadTools() {
        try {
            console.log('🔄 Fetching tools data from JSON...');
            
            const response = await fetch('./assets/data/tools.json'); 
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            this.tools = data.tools;
            this.categoriesData = data.categories; 
            this.filteredTools = [...this.tools];

            this.renderTools();
            this.renderFeaturedTools();
            this.renderTrendingTools();
            this.renderCategories();
            this.renderComparisonTools();
            this.updateStats();
            console.log('✅ Loaded ' + this.tools.length + ' tools from external JSON.');

        } catch (error) {
            console.error('❌ Failed to load tools data:', error);
            const container = document.getElementById('toolsGrid');
             if (container) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-exclamation-triangle display-1 text-danger mb-3"></i>
                        <h4 class="text-danger">فشل تحميل البيانات</h4>
                        <p class="text-muted">يرجى التأكد من وجود ملف <code>tools.json</code> في المسار الصحيح.</p>
                    </div>
                `;
            }
        }
    }

    // =============================================
    // 💡 باقي الدوال في AppHelpers... (بقي الكود كما هو)
    // =============================================
    setupEventListeners() {
        // ... (الكود الأصلي لدالة setupEventListeners هنا) ...
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debouncedSearch);
        }

        this.safeAddEventListener('#searchBtn', 'click', () => {
            this.applyFilters();
        });

        // Filters - تستخدم الآن debouncedSearch
        this.safeAddEventListener('#categoryFilter', 'change', this.debouncedSearch);
        this.safeAddEventListener('#pricingFilter', 'change', this.debouncedSearch);
        this.safeAddEventListener('#ratingFilter', 'change', this.debouncedSearch);
        this.safeAddEventListener('#sortFilter', 'change', this.debouncedSearch);

        // Quick tags
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-btn')) {
                const tag = e.target.getAttribute('data-tag');
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = tag;
                    this.applyFilters();
                }
            }
        });

        // Filter chips
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-chip')) {
                e.target.classList.toggle('active');
                this.debouncedSearch(); 
            }
        });

        // View options
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-options button')) {
                const button = e.target.closest('button');
                const view = button.getAttribute('data-view');
                this.setView(view);
            }
        });

        // Navigation
        this.safeAddEventListener('#bookmarksNav', 'click', (e) => {
            e.preventDefault();
            this.showBookmarks();
        });

        // Admin controls
        this.safeAddEventListener('#adminToggle', 'click', () => {
            if (this.isAdmin) {
                this.disableAdminMode();
            } else {
                const password = prompt('أدخل كلمة المرور للإدارة:');
                if (password === 'admin123') {
                    this.enableAdminMode();
                }
            }
        });

        this.safeAddEventListener('#addToolBtn', 'click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addToolModal'));
            modal.show();
        });

        this.safeAddEventListener('#saveToolBtn', 'click', () => {
            this.addNewTool();
        });

        this.safeAddEventListener('#startComparisonBtn', 'click', () => this.startComparison());
        this.safeAddEventListener('#clearComparisonBtn', 'click', () => {
            this.comparisonTools.clear();
            this.updateComparisonUI();
            this.renderTools();
            this.renderComparisonTools();
        });

        console.log('✅ Event listeners setup completed');
    }
    
    // ... جميع الدوال المساعدة الأخرى (renderCategories, updateStats, renderTools, updateUI, إلخ) ...

    renderCategories() {
        const container = document.getElementById('categoriesGrid');
        if (!container) return;

        const categories = this.categoriesData; 
        container.innerHTML = categories.map(category => {
            const categoryTools = this.tools.filter(tool => tool.category === category);
            const icon = this.getCategoryIcon(category);
            return `
                <div class="col-lg-3 col-md-4 col-sm-6">
                    <div class="card category-card" onclick="window.aiToolsApp.filterByCategory('${this.sanitizeHTML(category)}')">
                        <div class="card-body text-center">
                            <div class="category-icon">
                                <i class="${icon}" aria-hidden="true"></i>
                            </div>
                            <h5 class="card-title">${this.sanitizeHTML(category)}</h5>
                            <p class="text-muted">${categoryTools.length} أداة</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateStats() {
        document.getElementById('totalTools').textContent = this.tools.length + '+';
        document.getElementById('totalCategories').textContent = this.categoriesData.length + '+';
    }
    
    renderTools(tools = null) {
        const toolsToRender = tools || this.filteredTools;
        const container = document.getElementById('toolsGrid');
        
        if (!container) return;

        const totalPages = Math.ceil(toolsToRender.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedTools = toolsToRender.slice(startIndex, startIndex + this.itemsPerPage);

        if (!paginatedTools || paginatedTools.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-search display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">لم نعثر على أي أدوات</h4>
                    <p class="text-muted">جرب تعديل معايير البحث الخاصة بك</p>
                </div>
            `;
            this.renderPagination(0);
            return;
        }

        if (this.currentView === 'grid') {
            container.innerHTML = paginatedTools.map(tool => this.renderToolCard(tool)).join('');
        } else {
            container.innerHTML = paginatedTools.map(tool => this.renderToolListItem(tool)).join('');
        }

        this.renderPagination(totalPages);
        this.updateToolsCount();
    }

    renderToolCard(tool) {
        const isBookmarked = this.bookmarkedTools.has(tool.id);
        const isInComparison = this.comparisonTools.has(tool.id);
        return `
            <div class="col-lg-4 col-md-6 mb-4 fade-in">
                <div class="card tool-card h-100 position-relative" id="tool-${tool.id}">
                    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="window.aiToolsApp.toggleBookmark('${tool.id}')">
                        <i class="fas fa-bookmark"></i>
                    </button>
                    ${tool.featured ? '<span class="featured-badge">مميز</span>' : ''}
                    ${tool.trending ? '<span class="trending-badge" style="position: absolute; top: 1rem; right: 4rem;">شائع</span>' : ''}
                    ${tool.is_new ? '<span class="new-badge" style="position: absolute; top: 1rem; right: 7rem;">جديد</span>' : ''}
                    ${tool.pricing === 'مجاني' ? '<span class="free-badge" style="position: absolute; top: 1rem; right: 1rem;">مجاني</span>' : ''}
                    <span class="comparison-badge ${isInComparison ? 'active' : ''}" onclick="window.aiToolsApp.toggleComparison('${tool.id}')">
                        <i class="fas fa-balance-scale"></i>
                    </span>
                    <div class="tool-image-placeholder">
                        <i class="${tool.icon}" aria-hidden="true"></i>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${this.sanitizeHTML(tool.name_ar)}</h5>
                        <p class="card-text text-muted">${this.sanitizeHTML(tool.description_ar)}</p>
                        <div class="rating-stars mb-2">
                            ${this.generateRatingStars(tool.rating)}
                            <small class="text-muted ms-2">${tool.rating} (${tool.total_ratings})</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge bg-primary">${this.sanitizeHTML(tool.category)}</span>
                            <span class="badge ${this.getPricingBadgeClass(tool.pricing)}">${this.sanitizeHTML(tool.pricing)}</span>
                        </div>
                        <div class="tool-stats d-flex flex-wrap gap-1 mb-3">
                            <span class="tool-stat">
                                <i class="fas fa-eye"></i> ${tool.views.toLocaleString()}
                            </span>
                            <span class="tool-stat">
                                <i class="fas fa-star"></i> ${tool.total_ratings}
                            </span>
                        </div>
                        <a href="${this.sanitizeHTML(tool.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-100">
                            <i class="fas fa-external-link-alt me-1"></i>زيارة الموقع
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    renderToolListItem(tool) {
        const isBookmarked = this.bookmarkedTools.has(tool.id);
        const isInComparison = this.comparisonTools.has(tool.id);
        return `
            <div class="col-12 mb-4 fade-in">
                <div class="card tool-card">
                    <div class="row g-0">
                        <div class="col-md-3">
                            <div class="tool-image-placeholder h-100">
                                <i class="${tool.icon}" aria-hidden="true"></i>
                            </div>
                        </div>
                        <div class="col-md-9">
                            <div class="card-body position-relative">
                                <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="window.aiToolsApp.toggleBookmark('${tool.id}')">
                                    <i class="fas fa-bookmark"></i>
                                </button>
                                ${tool.featured ? '<span class="featured-badge">مميز</span>' : ''}
                                ${tool.trending ? '<span class="trending-badge">شائع</span>' : ''}
                                ${tool.is_new ? '<span class="new-badge">جديد</span>' : ''}
                                <span class="comparison-badge ${isInComparison ? 'active' : ''}" onclick="window.aiToolsApp.toggleComparison('${tool.id}')">
                                    <i class="fas fa-balance-scale"></i>
                                </span>
                                <h5 class="card-title">${this.sanitizeHTML(tool.name_ar)}</h5>
                                <p class="card-text text-muted">${this.sanitizeHTML(tool.description_ar)}</p>
                                <div class="row align-items-center">
                                    <div class="col-md-4">
                                        <div class="rating-stars mb-2">
                                            ${this.generateRatingStars(tool.rating)}
                                            <small class="text-muted ms-2">${tool.rating} (${tool.total_ratings})</small>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <span class="badge bg-primary">${this.sanitizeHTML(tool.category)}</span>
                                        <span class="badge ${this.getPricingBadgeClass(tool.pricing)}">${this.sanitizeHTML(tool.pricing)}</span>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        <a href="${this.sanitizeHTML(tool.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                                            <i class="fas fa-external-link-alt me-1"></i>زيارة الموقع
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPagination(totalPages) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.aiToolsApp.changePage(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.aiToolsApp.changePage(${i})">${i}</a>
                </li>
            `;
        }

        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.aiToolsApp.changePage(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.renderTools();
        window.scrollTo({ top: document.getElementById('tools').offsetTop - 100, behavior: 'smooth' });
    }

    renderFeaturedTools() {
        const container = document.getElementById('featuredTools');
        if (!container) return;

        const featuredTools = this.tools.filter(tool => tool.featured).slice(0, 6);
        container.innerHTML = featuredTools.map(tool => this.renderToolCard(tool)).join('');
    }

    renderTrendingTools() {
        const container = document.getElementById('trendingTools');
        if (!container) return;

        const trendingTools = this.tools.filter(tool => tool.trending).slice(0, 6);
        container.innerHTML = trendingTools.map(tool => this.renderToolCard(tool)).join('');
    }

    renderComparisonTools() {
        const container = document.getElementById('comparisonToolsGrid');
        if (!container) return;

        container.innerHTML = this.tools.slice(0, 6).map(tool => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card tool-card h-100">
                    <div class="tool-image-placeholder">
                        <i class="${tool.icon}" aria-hidden="true"></i>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${this.sanitizeHTML(tool.name_ar)}</h5>
                        <p class="card-text text-muted">${this.sanitizeHTML(tool.description_ar)}</p>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" 
                                   id="compare-${tool.id}" 
                                   onchange="window.aiToolsApp.toggleComparison('${tool.id}')"
                                   ${this.comparisonTools.has(tool.id) ? 'checked' : ''}>
                            <label class="form-check-label" for="compare-${tool.id}">
                                اختر للمقارنة
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksGrid');
        if (!container) return;

        if (this.bookmarkedTools.size === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-bookmark display-1 text-muted mb-3"></i>
                    <h4 class="text-muted">لم تقم بحفظ أي أدوات بعد</h4>
                    <p class="text-muted">استكشف الأدوات واحفظ المفضلة لديك</p>
                </div>
            `;
            return;
        }

        const bookmarkedTools = Array.from(this.bookmarkedTools).map(id => 
            this.tools.find(tool => tool.id === id)
        ).filter(tool => tool);

        container.innerHTML = bookmarkedTools.map(tool => this.renderToolCard(tool)).join('');
    }

    toggleBookmark(toolId) {
        if (this.bookmarkedTools.has(toolId)) {
            this.bookmarkedTools.delete(toolId);
        } else {
            this.bookmarkedTools.add(toolId);
        }
        this.saveBookmarks();
        this.updateBookmarksUI();
        this.renderTools();
        this.renderBookmarks();
    }

    loadBookmarks() {
        const saved = localStorage.getItem('ai_tools_bookmarks');
        if (saved) {
            this.bookmarkedTools = new Set(JSON.parse(saved));
        }
        this.updateBookmarksUI();
    }

    saveBookmarks() {
        localStorage.setItem('ai_tools_bookmarks', JSON.stringify(Array.from(this.bookmarkedTools)));
    }

    updateBookmarksUI() {
        const count = this.bookmarkedTools.size;
        document.getElementById('bookmarksCount').textContent = count;
    }

    toggleComparison(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        if (this.comparisonTools.has(toolId)) {
            this.comparisonTools.delete(toolId);
        } else {
            if (this.comparisonTools.size >= 3) {
                Swal.fire({
                    icon: 'warning',
                    title: 'حد أقصى',
                    text: 'يمكنك اختيار 3 أدوات كحد أقصى للمقارنة',
                    confirmButtonText: 'حسناً'
                });
                return;
            }
            this.comparisonTools.add(toolId);
        }

        this.updateComparisonUI();
        this.renderTools();
        this.renderComparisonTools();
    }

    updateComparisonUI() {
        const count = this.comparisonTools.size;
        document.getElementById('comparisonCount').textContent = count;
        document.getElementById('startComparisonBtn').disabled = count < 2;

        const itemsContainer = document.getElementById('comparisonItems');
        const existingItems = itemsContainer.querySelectorAll('li.comparison-item');
        existingItems.forEach(item => item.remove());

        const itemsHtml = Array.from(this.comparisonTools).map(toolId => {
            const tool = this.tools.find(t => t.id === toolId);
            return `<li class="comparison-item"><a class="dropdown-item" href="#" data-tool-id="${toolId}">${this.sanitizeHTML(tool.name_ar)}</a></li>`;
        }).join('');

        const compareNowLi = document.getElementById('compareNowBtn');
        if (compareNowLi) {
            compareNowLi.insertAdjacentHTML('beforebegin', itemsHtml);
        } else {
            itemsContainer.insertAdjacentHTML('beforeend', itemsHtml);
        }
    }

    startComparison() {
        if (this.comparisonTools.size < 2) {
            Swal.fire({
                icon: 'warning',
                title: 'اختر أدوات',
                text: 'يجب اختيار أداتين على الأقل للمقارنة',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        const comparisonTools = Array.from(this.comparisonTools).map(id => 
            this.tools.find(tool => tool.id === id)
        );

        this.showComparisonModal(comparisonTools);
    }

    showComparisonModal(tools) {
        tools.forEach((tool, index) => {
            const header = document.getElementById('comparisonTool' + (index + 1));
            if (header) {
                header.textContent = tool.name_ar;
                header.style.display = 'table-cell';
            }
        });

        for (let i = tools.length + 1; i <= 3; i++) {
            const header = document.getElementById('comparisonTool' + i);
            if (header) header.style.display = 'none';
        }

        const tableBody = document.getElementById('comparisonTableBody');
        const rows = [
            { feature: 'التقييم', getValue: tool => tool.rating + ' ⭐' },
            { feature: 'نوع الاشتراك', getValue: tool => tool.pricing },
            { feature: 'الفئة', getValue: tool => tool.category },
            { feature: 'عدد التقييمات', getValue: tool => tool.total_ratings.toLocaleString() },
            { feature: 'المشاهدات', getValue: tool => tool.views.toLocaleString() },
            { feature: 'الحالة', getValue: tool => tool.trending ? 'شائع' : (tool.is_new ? 'جديد' : 'عادي') }
        ];

        tableBody.innerHTML = rows.map(row => `
            <tr>
                <td><strong>${row.feature}</strong></td>
                ${tools.map(tool => '<td>' + row.getValue(tool) + '</td>').join('')}
            </tr>
        `).join('');

        const modal = new bootstrap.Modal(document.getElementById('comparisonModal'));
        modal.show();
    }

    filterByCategory(category) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = category;
            this.applyFilters();
        }
    }

    applyFilters() {
        const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || 'all';
        const pricing = document.getElementById('pricingFilter')?.value || 'all';
        const rating = document.getElementById('ratingFilter')?.value || 'all';
        const sort = document.getElementById('sortFilter')?.value || 'popular';

        let filtered = this.tools.filter(tool => {
            const matchesSearch = !query || 
                tool.name_ar.toLowerCase().includes(query) || 
                tool.description_ar.toLowerCase().includes(query) ||
                (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(query)));
            
            const matchesCategory = category === 'all' || tool.category === category;
            const matchesPricing = pricing === 'all' || tool.pricing === pricing;
            const matchesRating = rating === 'all' || tool.rating >= parseFloat(rating);
            
            return matchesSearch && matchesCategory && matchesPricing && matchesRating;
        });

        switch(sort) {
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'newest':
                filtered.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
                break;
            case 'name':
                filtered.sort((a, b) => a.name_ar.localeCompare(b.name_ar));
                break;
            case 'trending':
                filtered.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
                break;
            case 'popular':
            default:
                filtered.sort((a, b) => b.views - a.views);
                break;
        }

        this.filteredTools = filtered;
        this.currentPage = 1;
        this.renderTools();
    }

    checkAdminMode() {
        const isAdmin = localStorage.getItem('ai_tools_admin') === 'true';
        if (isAdmin) {
            this.enableAdminMode();
        }
    }

    enableAdminMode() {
        this.isAdmin = true;
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('adminToggle').style.display = 'block';
        localStorage.setItem('ai_tools_admin', 'true');
    }

    disableAdminMode() {
        this.isAdmin = false;
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminToggle').style.display = 'none';
        localStorage.setItem('ai_tools_admin', 'false');
    }

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-options button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });
        this.renderTools();
    }

    showBookmarks() {
        document.querySelectorAll('section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById('bookmarks').style.display = 'block';
        this.renderBookmarks();
    }

    addNewTool() {
        const name = document.getElementById('toolName').value;
        const category = document.getElementById('toolCategory').value;
        const description = document.getElementById('toolDescription').value;
        const link = document.getElementById('toolLink').value;
        const pricing = document.getElementById('toolPricing').value;
        const tags = document.getElementById('toolTags').value.split(',').map(tag => tag.trim());

        if (!name || !category || !description || !link) {
            Swal.fire({
                icon: 'error',
                title: 'بيانات ناقصة',
                text: 'يرجى ملء جميع الحقول المطلوبة',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        const newTool = {
            id: 'tool-' + Date.now(),
            name_ar: name,
            name_en: name,
            description_ar: description,
            category: category,
            pricing: pricing,
            rating: 4.0,
            views: 0,
            featured: false,
            trending: false,
            total_ratings: 0,
            tags: tags,
            link: link,
            icon: this.getCategoryIcon(category),
            is_new: true
        };

        this.tools.unshift(newTool);
        this.filteredTools.unshift(newTool);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addToolModal'));
        modal.hide();

        document.getElementById('addToolForm').reset();

        Swal.fire({
            icon: 'success',
            title: 'تمت الإضافة',
            text: 'تمت إضافة الأداة الجديدة بنجاح',
            confirmButtonText: 'حسناً'
        });

        this.renderTools();
        this.renderFeaturedTools();
        this.renderTrendingTools();
        this.renderCategories();
        this.updateStats();
    }

    generateRatingStars(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<i class="fas fa-star text-warning"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                stars += '<i class="far fa-star text-warning"></i>';
            }
        }
        return stars;
    }

    getPricingBadgeClass(pricing) {
        switch(pricing) {
            case 'مجاني': return 'bg-success';
            case 'مدفوع': return 'bg-danger';
            case 'freemium': return 'bg-warning text-dark';
            case 'open-source': return 'bg-info';
            default: return 'bg-secondary';
        }
    }

    getCategoryIcon(category) {
        const icons = {
            'كتابة النصوص والمحتوى': 'fas fa-pen',
            'توليد الصور': 'fas fa-image',
            'الصوت والموسيقى': 'fas fa-music',
            'الفيديو والتحرير': 'fas fa-video',
            'البرمجة والكود': 'fas fa-code',
            'التصميم والإبداع': 'fas fa-paint-brush',
            'التسويق والمحتوى الرقمي': 'fas fa-bullhorn',
            'التعليم والدراسة': 'fas fa-graduation-cap',
            'الإنتاجية والمساعدة اليومية': 'fas fa-tasks',
            'أدوات البحث والذكاء العام': 'fas fa-search'
        };
        return icons[category] || 'fas fa-cube';
    }

    sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    updateToolsCount() {
        const toolsCount = document.getElementById('toolsCount');
        if (toolsCount) {
            const total = this.filteredTools.length;
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, total);
            toolsCount.textContent = `عرض ${start}-${end} من ${total} أداة`;
        }
    }

    safeAddEventListener(selector, event, handler) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    updateUI(user) {
        const isUserLoggedIn = !!user;
        this.isUserLoggedIn = isUserLoggedIn;
        
        const loginStatusElement = document.getElementById('login-status');
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-button');
        const loginPrompt = document.getElementById('login-prompt');
        const toolsRestrictedContent = document.getElementById('tools-restricted-content');
        const toolsContentSection = document.getElementById('tools-content');
        const comparisonDropdown = document.getElementById('comparisonDropdown');
        const toolsNavLink = document.getElementById('toolsNavLink');

        if (isUserLoggedIn) {
            loginStatusElement.textContent = `أهلاً، ${user.displayName || user.email.split('@')[0]}!`; 
            loginButton.style.display = 'none';
            logoutButton.style.display = 'block';
            loginPrompt.style.display = 'none'; 
            
            toolsRestrictedContent.style.display = 'block';
            toolsContentSection.style.display = 'block';
            
            if (toolsNavLink) toolsNavLink.style.display = 'list-item';
            if (comparisonDropdown) comparisonDropdown.style.display = 'list-item';
            
        } else {
            loginStatusElement.textContent = 'تسجيل الدخول مطلوب';
            loginButton.style.display = 'block';
            logoutButton.style.display = 'none';
            loginPrompt.style.display = 'block'; 

            toolsRestrictedContent.style.display = 'none';
            toolsContentSection.style.display = 'none';

            if (toolsNavLink) toolsNavLink.style.display = 'none';
            if (comparisonDropdown) comparisonDropdown.style.display = 'none';
        }
    }
}


// =============================================
// 🔧 INITIALIZATION - المحسن ليتوافق مع Firebase
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    
    // Load saved theme 
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Theme toggle 
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }

    // تهيئة كائن التطبيق
    const app = new AppHelpers();

    // ***************************************************************
    // *** منطق Firebase الرئيسي: معالجة إعادة التوجيه والتحقق من المستخدم ***
    // ***************************************************************
    
    if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {
        
        // 1. معالجة نتيجة إعادة التوجيه أولاً (لتسجيل الدخول بنجاح)
        firebase.auth().getRedirectResult().then((result) => {
            if (result.credential) {
                console.log("تم تسجيل الدخول بنجاح عبر إعادة التوجيه. أهلاً بك يا", result.user.displayName);
            }
        }).catch((error) => {
            // يمكن أن تحدث أخطاء هنا إذا قام المستخدم بإلغاء العملية
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                console.error("خطأ أثناء معالجة إعادة التوجيه:", error);
                if (typeof Swal !== 'undefined') {
                    // رسالة توضح أن إعادة التوجيه فشلت لأسباب أخرى غير الإلغاء
                    Swal.fire('خطأ في الدخول!', `فشل في معالجة إعادة التوجيه: ${error.message}`, 'error');
                }
            }
        });
        
        // 2. استخدام onAuthStateChanged للتحقق من حالة المستخدم وتشغيل التطبيق
        auth.onAuthStateChanged((user) => {
            
            // تحديث واجهة المستخدم (إظهار/إخفاء الأزرار والمحتوى)
            app.updateUI(user); 
            
            // تشغيل منطق التطبيق الأصلي (تحميل الأدوات)
            if (!app.isLoaded) { 
                app.initAppContent();
                app.isLoaded = true;
                
                // تهيئة AOS بعد تحميل المحتوى
                if (typeof AOS !== 'undefined') {
                    AOS.init({
                        duration: 1000,
                        once: true,
                        offset: 100
                    });
                }
            }
            
            console.log('🎉 Application initialized successfully via Firebase state check');
        });
    } else {
        // حالة الطوارئ: إذا فشلت تهيئة Firebase، نشغل التطبيق بدون قيود
        console.warn("⚠️ Firebase or Auth object not found. Running app without authentication checks.");
        app.initAppContent();
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 1000, once: true, offset: 100 });
        }
    }
});
