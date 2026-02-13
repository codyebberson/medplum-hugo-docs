import mermaid from 'mermaid';
import Swup from 'swup';
import { initAnimatedCircles } from './components/animated-circle.mjs';
import { initTabs } from './components/tabs.mjs';

mermaid.initialize({ startOnLoad: true });

function setAttribute(key, value) {
  document.body.dataset[key] = value;
}

function updateAttributes(newUrl) {
  const onDocsPage = newUrl.includes('/docs/');
  setAttribute('breadcrumbs', onDocsPage ? 'visible' : 'hidden');
  setAttribute('sidebar', onDocsPage ? 'open' : 'closed');
  setAttribute('toc', onDocsPage ? 'visible' : 'hidden');
  setAttribute('docFooter', onDocsPage ? 'visible' : 'hidden');
}

function updateActiveLinks() {
  document.querySelectorAll('.sidebar-category-header-wrapper.active').forEach((el) => {
    el.classList.remove('active');
  });

  document.querySelectorAll('.sidebar-link.active').forEach((el) => {
    el.classList.remove('active');
  });

  document.querySelectorAll('.sidebar-link[href]').forEach((link) => {
    if (link.href === window.location.href) {
      link.closest('.sidebar-category-header-wrapper')?.classList.add('active');
      link.classList.add('active');
    }
  });
}

document.body.addEventListener('click', (event) => {
  const target = event.target;

  if (target.matches('.sidebar-caret')) {
    console.log('Toggle sidebar category:', target);
    const category = target.closest('.sidebar-category');
    if (category) {
      category.classList.toggle('expanded');
    }
  }

  if (target.matches('.sidebar-category-link')) {
    const category = target.closest('.sidebar-category');
    if (category) {
      if (target.href === window.location.href) {
        category.classList.toggle('expanded');
      } else {
        category.classList.add('expanded');
      }
    }
  }
});

export const swup = new Swup({
  containers: ['#swup'],
  animationSelector: false,
  animateHistoryBrowsing: false,
});

swup.hooks.before('content:replace', (visit) => {
  updateAttributes(visit.to.url);
});

swup.hooks.on('content:replace', (visit) => {
  initAnimatedCircles();
  initTabs();
  updateActiveLinks();
});

updateAttributes(window.location.href);
initAnimatedCircles();
initTabs();
