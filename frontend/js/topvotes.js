// js/topvotes.js
// Community leaderboard page. Previously this page showed 6 hardcoded
// fake ideas and never touched real data at all. It now fetches real
// ideas from the database via GET /api/ideas and sorts them client-side.

document.addEventListener('DOMContentLoaded', () => {
  const ideasContainer = document.getElementById('ideasContainer');
  const sortOptions = document.querySelectorAll('.sort-option');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let allIdeas = [];
  let filteredIdeas = [];
  let currentSort = 'top';
  let displayCount = 6;

  loadIdeas();

  sortOptions.forEach(option => {
    option.addEventListener('click', () => {
      sortOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      currentSort = option.dataset.sort;
      displayCount = 6;
      applySortAndFilter();
      renderIdeas();
    });
  });

  searchBtn.addEventListener('click', () => {
    displayCount = 6;
    applySortAndFilter();
    renderIdeas();
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      displayCount = 6;
      applySortAndFilter();
      renderIdeas();
    }
  });

  loadMoreBtn.addEventListener('click', () => {
    displayCount += 3;
    renderIdeas();
  });

  async function loadIdeas() {
    ideasContainer.innerHTML = '<div class="empty-state"><p>Loading ideas...</p></div>';
    try {
      allIdeas = await apiFetch('/ideas');
      applySortAndFilter();
      renderIdeas();
    } catch (err) {
      ideasContainer.innerHTML = `<div class="empty-state"><p>Couldn't load ideas: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  function applySortAndFilter() {
    const searchTerm = searchInput.value.toLowerCase();

    filteredIdeas = !searchTerm ? [...allIdeas] : allIdeas.filter(idea =>
      idea.title.toLowerCase().includes(searchTerm) ||
      idea.description.toLowerCase().includes(searchTerm) ||
      (idea.language && idea.language.toLowerCase().includes(searchTerm))
    );

    switch (currentSort) {
      case 'newest':
        filteredIdeas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'discussed':
        filteredIdeas.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
        break;
      default: // 'top'
        filteredIdeas.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    }
  }

  function renderIdeas() {
    const ideasToShow = filteredIdeas.slice(0, displayCount);

    if (ideasToShow.length === 0) {
      ideasContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-lightbulb"></i>
          <p>No ideas found matching your search</p>
        </div>`;
      loadMoreBtn.style.display = 'none';
      return;
    }

    ideasContainer.innerHTML = ideasToShow.map(createIdeaCard).join('');
    loadMoreBtn.style.display = displayCount >= filteredIdeas.length ? 'none' : 'block';
  }

  function createIdeaCard(idea) {
    const formattedDate = new Date(idea.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    return `
      <div class="idea-card ${idea.vote_count > 10 ? 'featured' : ''}">
        <h3>${escapeHtml(idea.title)}</h3>
        <p>${escapeHtml(idea.description)}</p>

        <div class="tags-container">
          ${idea.language ? `<span class="tag">${escapeHtml(idea.language)}</span>` : ''}
          <span class="difficulty ${idea.difficulty || ''}">
            ${idea.difficulty ? idea.difficulty.charAt(0).toUpperCase() + idea.difficulty.slice(1) : 'Not specified'}
          </span>
        </div>

        <div class="idea-meta">
          <span>${escapeHtml(idea.author)}</span>
          <span>${formattedDate}</span>
          <span class="upvote-count">
            <i class="fas fa-thumbs-up"></i> ${idea.vote_count || 0}
            &bull; <i class="fas fa-comment"></i> ${idea.comment_count || 0}
          </span>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
});
