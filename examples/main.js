// Collapsible sections
document.querySelectorAll('.section-title.collapsible').forEach(title => {
  title.addEventListener('click', () => {
    title.classList.toggle('collapsed');
    const content = title.nextElementSibling;
    content.classList.toggle('collapsed');
  });
});

// Search functionality
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();

  // Search through all links
  document.querySelectorAll('.section-card').forEach(section => {
    const links = section.querySelectorAll('a');
    let hasVisibleLinks = false;

    links.forEach(link => {
      const text = link.textContent.toLowerCase();
      const listItem = link.closest('li');

      if (text.includes(searchTerm)) {
        listItem.classList.remove('hidden');
        hasVisibleLinks = true;
      } else {
        listItem.classList.add('hidden');
      }
    });

    // Also hide/show categories
    section.querySelectorAll('.category').forEach(category => {
      const visibleLinks = category.querySelectorAll('li:not(.hidden)');
      if (visibleLinks.length === 0) {
        category.classList.add('hidden');
      } else {
        category.classList.remove('hidden');
      }
    });

    // Show/hide entire sections based on whether they have visible content
    if (hasVisibleLinks) {
      section.classList.remove('hidden');
      // Expand section if searching
      if (searchTerm) {
        const title = section.querySelector('.section-title');
        const content = section.querySelector('.section-content');
        title.classList.remove('collapsed');
        content.classList.remove('collapsed');
      }
    } else {
      section.classList.add('hidden');
    }
  });
});
