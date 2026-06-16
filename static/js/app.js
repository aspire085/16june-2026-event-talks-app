/**
 * BQ Pulse — Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allReleaseNotes = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let isRefreshing = false;

    // DOM Elements
    const timelineContainer = document.getElementById('timeline-container');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('#filter-chips .chip');
    
    const btnRefresh = document.getElementById('btn-refresh');
    const btnRefreshMobile = document.getElementById('btn-refresh-mobile');
    
    // Stats Elements
    const statTotalNotes = document.getElementById('stat-total-notes');
    const statFeaturesCount = document.getElementById('stat-features-count');
    const statFixesCount = document.getElementById('stat-fixes-count');
    const statChangesCount = document.getElementById('stat-changes-count');
    const cacheTimeValue = document.getElementById('cache-time-value');

    // Initialize App
    init();

    function init() {
        // Fetch initial release notes
        fetchReleaseNotes();

        // Event Listeners
        btnRefresh.addEventListener('click', () => refreshFeed());
        btnRefreshMobile.addEventListener('click', () => refreshFeed());
        
        // Live search filter (debounced)
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value.trim().toLowerCase();
                renderTimeline();
            }, 150);
        });

        // Category filter chips
        filterChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const target = e.currentTarget;
                
                // Toggle active class
                filterChips.forEach(c => c.classList.remove('active'));
                target.classList.add('active');
                
                currentFilter = target.getAttribute('data-category');
                renderTimeline();
            });
        });
    }

    /**
     * Fetches release notes from the Flask backend API.
     */
    async function fetchReleaseNotes(forceRefresh = false) {
        if (isRefreshing) return;
        isRefreshing = true;
        
        setLoadingState(true);
        
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                allReleaseNotes = result.data;
                updateStats(result.data, result.cached_at);
                renderTimeline();
                
                if (forceRefresh) {
                    showToast('Feed updated successfully!', 'success');
                }
            } else {
                throw new Error(result.error || 'Unknown server error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showToast(`Error: ${error.message || 'Failed to connect to server'}`, 'error');
            
            // If we have no data, show empty state
            if (allReleaseNotes.length === 0) {
                timelineContainer.style.display = 'none';
                emptyState.style.display = 'flex';
            }
        } finally {
            isRefreshing = false;
            setLoadingState(false);
        }
    }

    /**
     * Triggers a manual refresh of the feed.
     */
    function refreshFeed() {
        fetchReleaseNotes(true);
    }

    /**
     * Toggles the UI loading indicator states.
     */
    function setLoadingState(isLoading) {
        if (isLoading) {
            skeletonLoader.style.display = 'flex';
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'none';
            
            // Disable & spin desktop button
            btnRefresh.disabled = true;
            btnRefresh.classList.add('loading');
            
            // Spin mobile button
            btnRefreshMobile.disabled = true;
            btnRefreshMobile.classList.add('loading');
        } else {
            skeletonLoader.style.display = 'none';
            
            // Enable & stop desktop button
            btnRefresh.disabled = false;
            btnRefresh.classList.remove('loading');
            
            // Enable & stop mobile button
            btnRefreshMobile.disabled = false;
            btnRefreshMobile.classList.remove('loading');
        }
    }

    /**
     * Processes raw Atom HTML content, styles header tags as category badges,
     * and structures target attributes on links.
     */
    function processReleaseContent(htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Find headings and add appropriate badges
        const headings = tempDiv.querySelectorAll('h3');
        headings.forEach(h3 => {
            const text = h3.textContent.trim().toLowerCase();
            if (text.includes('feature')) {
                h3.className = 'badge-feature';
            } else if (text.includes('fix')) {
                h3.className = 'badge-fix';
            } else if (text.includes('changed') || text.includes('change')) {
                h3.className = 'badge-changed';
            } else if (text.includes('deprecation')) {
                h3.className = 'badge-deprecation';
            } else if (text.includes('security')) {
                h3.className = 'badge-security';
            }
        });

        // Format links to open in a new tab
        const links = tempDiv.querySelectorAll('a');
        links.forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });

        return tempDiv.innerHTML;
    }

    /**
     * Filters and renders the timeline cards based on current query/category.
     */
    function renderTimeline() {
        timelineContainer.innerHTML = '';
        
        // Filter Notes
        const filteredNotes = allReleaseNotes.filter(note => {
            const contentLower = note.content.toLowerCase();
            const titleLower = note.title.toLowerCase();
            
            // 1. Search Query Filter
            const matchesSearch = searchQuery === '' || 
                                 titleLower.includes(searchQuery) || 
                                 contentLower.includes(searchQuery);
            
            // 2. Category Filter
            let matchesCategory = true;
            if (currentFilter !== 'all') {
                if (currentFilter === 'changed') {
                    matchesCategory = contentLower.includes('<h3>changed</h3>') || contentLower.includes('<h3>change</h3>');
                } else {
                    matchesCategory = contentLower.includes(`<h3>${currentFilter}</h3>`);
                }
            }
            
            return matchesSearch && matchesCategory;
        });

        if (filteredNotes.length === 0) {
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        timelineContainer.style.display = 'flex';
        emptyState.style.display = 'none';

        // Render Cards
        filteredNotes.forEach((note, index) => {
            const card = document.createElement('article');
            card.className = 'update-card';
            card.style.animationDelay = `${index * 0.05}s`; // Staggered entry animation
            
            const processedContent = processReleaseContent(note.content);
            
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="update-date">${note.title}</h3>
                    <div class="card-actions">
                        <button class="btn-card-action btn-copy-link" data-link="${note.link}" title="Copy link to this release">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                        </button>
                        <button class="btn-card-action btn-tweet" data-title="${note.title}" data-link="${note.link}" title="Tweet about this release">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="update-content">
                    ${processedContent}
                </div>
            `;
            
            // Add copy button listener
            const copyBtn = card.querySelector('.btn-copy-link');
            copyBtn.addEventListener('click', (e) => {
                const link = e.currentTarget.getAttribute('data-link');
                if (link) {
                    navigator.clipboard.writeText(link).then(() => {
                        showToast('Link copied to clipboard!', 'success');
                    }).catch(err => {
                        console.error('Failed to copy link: ', err);
                        showToast('Failed to copy link', 'error');
                    });
                }
            });

            // Add tweet button listener
            const tweetBtn = card.querySelector('.btn-tweet');
            tweetBtn.addEventListener('click', (e) => {
                const link = e.currentTarget.getAttribute('data-link');
                const title = e.currentTarget.getAttribute('data-title');
                const tweetText = `BigQuery Release Notes — ${title}:`;
                const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(link)}`;
                window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            });

            timelineContainer.appendChild(card);
        });
    }

    /**
     * Analyzes all release notes to compute stats and updates the stats card.
     */
    function updateStats(notes, cachedTimestamp) {
        let totalFeatures = 0;
        let totalFixes = 0;
        let totalChanges = 0;

        notes.forEach(note => {
            const contentLower = note.content.toLowerCase();
            if (contentLower.includes('<h3>feature</h3>')) totalFeatures++;
            if (contentLower.includes('<h3>fix</h3>')) totalFixes++;
            if (contentLower.includes('<h3>changed</h3>') || contentLower.includes('<h3>change</h3>')) totalChanges++;
        });

        // Set Values
        statTotalNotes.textContent = notes.length;
        statFeaturesCount.textContent = totalFeatures;
        statFixesCount.textContent = totalFixes;
        statChangesCount.textContent = totalChanges;

        // Set Last Fetched Timestamp
        if (cachedTimestamp) {
            const date = new Date(cachedTimestamp * 1000);
            cacheTimeValue.textContent = date.toLocaleString();
        } else {
            cacheTimeValue.textContent = 'Never';
        }
    }

    /**
     * Displays a temporary toast notification alert on the bottom right.
     */
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '⚡';
        if (type === 'success') icon = '✓';
        if (type === 'error') icon = '✗';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-msg">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3500);
    }

    // --- Floating Tweet Button for Text Selection ---
    const tweetBubble = document.createElement('button');
    tweetBubble.id = 'tweet-selection-bubble';
    tweetBubble.className = 'tweet-bubble';
    tweetBubble.title = 'Tweet this selection';
    tweetBubble.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>Tweet Selection</span>
    `;
    document.body.appendChild(tweetBubble);

    let selectedText = '';
    let selectedLink = '';

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    function handleTextSelection(e) {
        if (e.target.closest('#tweet-selection-bubble')) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (!text) {
            hideSelectionBubble();
            return;
        }

        const anchorNode = selection.anchorNode;
        if (!anchorNode) {
            hideSelectionBubble();
            return;
        }

        const parentCard = anchorNode.parentElement.closest('.update-card');
        if (!parentCard) {
            hideSelectionBubble();
            return;
        }

        selectedText = text;
        selectedLink = parentCard.querySelector('.btn-copy-link').getAttribute('data-link');

        // Position bubble above selection
        try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const bubbleHeight = 40;
            const bubbleWidth = 140;
            const top = rect.top + window.scrollY - bubbleHeight - 8;
            const left = rect.left + window.scrollX + (rect.width / 2) - (bubbleWidth / 2);

            tweetBubble.style.top = `${top}px`;
            tweetBubble.style.left = `${left}px`;
            tweetBubble.style.display = 'flex';
            setTimeout(() => tweetBubble.classList.add('visible'), 20);
        } catch (err) {
            console.error('Error positioning selection bubble:', err);
        }
    }

    function hideSelectionBubble() {
        tweetBubble.classList.remove('visible');
        setTimeout(() => {
            if (!tweetBubble.classList.contains('visible')) {
                tweetBubble.style.display = 'none';
            }
        }, 200);
    }

    tweetBubble.addEventListener('click', () => {
        if (selectedText && selectedLink) {
            let tweetContent = `"${selectedText}"`;
            if (tweetContent.length > 200) {
                tweetContent = tweetContent.substring(0, 197) + '..."';
            }
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}&url=${encodeURIComponent(selectedLink)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer');
            hideSelectionBubble();
            window.getSelection().removeAllRanges();
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('#tweet-selection-bubble')) {
            hideSelectionBubble();
        }
    });
});
