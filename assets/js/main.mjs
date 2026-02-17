import mermaid from 'mermaid';
import Swup from 'swup';
import { destroyAnimatedCircles, initAnimatedCircles } from './components/animated-circle.mjs';
import { initTabs } from './components/tabs.mjs';
import { destroyToc, initToc } from './components/toc.mjs';

mermaid.initialize({ startOnLoad: true });

function setAttribute(key, value) {
  document.body.dataset[key] = value;
}

function updateAttributes(newUrl) {
  const onDocsPage = newUrl.includes('/docs/');
  setAttribute('breadcrumbs', onDocsPage ? 'visible' : 'hidden');
  setAttribute('sidebar', onDocsPage ? 'open' : 'closed');
  setAttribute('docFooter', onDocsPage ? 'visible' : 'hidden');

  const showToc = onDocsPage || newUrl.includes('/blog/') || newUrl.includes('/careers/') || newUrl.includes('/terms');
  setAttribute('toc', showToc ? 'visible' : 'hidden');
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

document.body.addEventListener('click', (e) => {
  const target = e.target;

  if (target.matches('.sidebar-caret')) {
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

document.querySelector('.theme-toggle').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

export const swup = new Swup({
  containers: ['#swup'],
  animationSelector: false,
  animateHistoryBrowsing: false,
});

swup.hooks.before('content:replace', (visit) => {
  updateAttributes(visit.to.url);
  destroyAnimatedCircles();
  destroyToc();
});

swup.hooks.on('content:replace', (visit) => {
  initAnimatedCircles();
  initTabs();
  initToc();
  updateActiveLinks();
  mermaid.run().catch(console.error);
});

updateAttributes(window.location.href);
initAnimatedCircles();
initTabs();
initToc();
