'use strict';

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('svg');
const sunIcon = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
const moonIcon = '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>';

function syncTheme() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeIcon.innerHTML = dark ? sunIcon : moonIcon;
  document.querySelector('meta[name="theme-color"]').content = dark ? '#171d19' : '#f7f7f2';
}
syncTheme();
themeToggle.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  if (dark) root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch (_) {}
  syncTheme();
});

// The featured slideshow shares its images and links with the project cards.
function initializeHeroSlideshow() {
  const carousel = document.getElementById('heroSlideshow');
  const track = document.getElementById('heroSlides');
  const projects = [...document.querySelectorAll('.projects-grid .project-card')];
  if (projects.length < 2) return;

  const template = track.firstElementChild;
  const indicators = document.getElementById('heroIndicators');
  const playButton = document.getElementById('heroPlay');
  const caption = document.getElementById('heroSlideCaption');
  const counter = document.getElementById('heroSlideCount');
  const announcement = document.getElementById('heroAnnouncement');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const subtitles = ['Retail demo', 'E-commerce', 'Parenting platform', 'Venue booking'];
  const names = projects.map(project => project.querySelector('h3').textContent.trim());
  const dots = [];
  const slides = projects.map((project, i) => {
    const slide = i === 0 ? template : template.cloneNode(true);
    const link = slide.querySelector('.browser');
    const image = slide.querySelector('img');
    const projectImage = project.querySelector('img');
    slide.setAttribute('aria-label', `${i + 1} of ${projects.length}: ${names[i]}`);
    slide.setAttribute('aria-hidden', String(i !== 0));
    slide.classList.toggle('is-active', i === 0);
    slide.inert = i !== 0;
    link.href = project.querySelector('.project-link').href;
    link.setAttribute('aria-label', `Open the ${names[i]} live demo in a new tab`);
    slide.querySelector('.browser-bar span').textContent = `${names[i].toLowerCase()} / interactive demo`;
    image.src = projectImage.getAttribute('src');
    image.alt = projectImage.alt;
    if (i !== 0) {
      image.removeAttribute('fetchpriority');
      image.decoding = 'async';
      track.append(slide);
    }
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-indicator';
    dot.setAttribute('aria-label', `Show ${names[i]}`);
    dot.setAttribute('aria-controls', 'heroSlides');
    dot.setAttribute('aria-pressed', String(i === 0));
    dot.addEventListener('click', () => show(i));
    indicators.append(dot);
    dots.push(dot);
    return slide;
  });

  let index = 0;
  let playing = !reducedMotion.matches;
  let hovering = false;
  let focusWithin = false;
  let onScreen = true;
  let timer;

  function schedule() {
    clearTimeout(timer);
    if (playing && !hovering && !focusWithin && onScreen && !document.hidden) {
      timer = setTimeout(() => show(index + 1, true), 6000);
    }
  }

  function show(next, automatic = false) {
    const nextIndex = (next + slides.length) % slides.length;
    const transferFocus = slides[index].contains(document.activeElement);
    index = nextIndex;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
      dots[i].setAttribute('aria-pressed', String(active));
    });
    counter.textContent = `Featured build / ${String(index + 1).padStart(2, '0')}`;
    caption.textContent = `${names[index]} — ${subtitles[index] || 'Web application'}`;
    if (!automatic) announcement.textContent = `Project ${index + 1} of ${slides.length}: ${names[index]}`;
    if (transferFocus) slides[index].querySelector('a').focus({ preventScroll: true });
    schedule();
  }

  function syncPlayButton() {
    playButton.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    playButton.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
    schedule();
  }

  document.getElementById('heroPrev').addEventListener('click', () => show(index - 1));
  document.getElementById('heroNext').addEventListener('click', () => show(index + 1));
  playButton.addEventListener('click', () => {
    playing = !playing;
    // Explicit playback can resume while its persistent control has focus.
    if (playing) focusWithin = false;
    syncPlayButton();
  });
  carousel.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    hovering = true;
    schedule();
  });
  carousel.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  carousel.addEventListener('focusin', () => { focusWithin = true; schedule(); });
  carousel.addEventListener('focusout', event => {
    focusWithin = carousel.contains(event.relatedTarget);
    schedule();
  });
  carousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });

  let touchStart;
  let ignoreClickUntil = 0;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
  });
  track.addEventListener('pointercancel', () => { touchStart = null; });
  track.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      ignoreClickUntil = Date.now() + 500;
      show(index + (dx < 0 ? 1 : -1));
    }
  });
  track.addEventListener('click', event => {
    if (Date.now() < ignoreClickUntil) event.preventDefault();
  }, true);

  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) playing = false;
    syncPlayButton();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(carousel);
  }
  document.getElementById('heroControls').hidden = false;
  syncPlayButton();
}
initializeHeroSlideshow();

const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
function setMenu(open) {
  mobileNav.hidden = !open;
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
}
navToggle.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    setMenu(false);
    navToggle.focus();
  }
});
matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

// Native dialog contains keyboard focus and restores the preview opener.
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImg');
const lightboxLink = document.getElementById('lightboxLink');
let previewOpener;
function openPreview(source, image, opener) {
  if (!source || !image) return;
  previewOpener = opener;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  document.getElementById('lightboxTitle').textContent = source.dataset.title || image.alt;
  document.getElementById('lightboxType').textContent = source.dataset.type || '';
  document.getElementById('lightboxDesc').textContent = source.dataset.desc || '';
  const tags = document.getElementById('lightboxTags');
  tags.replaceChildren();
  (source.dataset.tags || '').split(',').filter(Boolean).forEach(text => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = text.trim();
    tags.append(tag);
  });
  const liveLink = source.querySelector('.project-link');
  lightboxLink.hidden = !liveLink;
  if (liveLink) lightboxLink.href = liveLink.href;
  else lightboxLink.removeAttribute('href');
  lightbox.showModal();
}
document.querySelectorAll('.media-trigger, .details-button').forEach(button => {
  button.addEventListener('click', () => {
    const source = button.closest('.slide') || button.closest('.project-card');
    openPreview(source, button.querySelector('img') || source.querySelector('img'), button);
  });
});
document.querySelectorAll('[data-preview]').forEach(button => {
  button.addEventListener('click', () => openPreview(button, button.querySelector('img'), button));
});
document.getElementById('lightboxClose').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    lightbox.close();
  }
});
lightbox.addEventListener('click', event => {
  if (event.target !== lightbox) return;
  const rect = lightbox.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
});
lightbox.addEventListener('close', () => {
  if (!lightbox.open) previewOpener?.focus({ preventScroll: true });
});

// Manual galleries respect the visitor's pace; hidden slides cannot receive focus.
document.querySelectorAll('.slider-card').forEach(card => {
  const slides = [...card.querySelectorAll('.slide')];
  const dots = [...card.querySelectorAll('.slider-dots .dot')];
  let index = 0;
  const announce = document.createElement('span');
  announce.className = 'gallery-status';
  announce.setAttribute('role', 'status');
  announce.setAttribute('aria-live', 'polite');
  card.querySelector('.slider-controls').append(announce);
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.setAttribute('aria-label', `Show ${slides[i].dataset.title}`);
      dot.setAttribute('aria-pressed', String(i === index));
    });
    announce.textContent = `${index + 1} / ${slides.length}`;
  }
  card.querySelector('.slider-prev').addEventListener('click', () => show(index - 1));
  card.querySelector('.slider-next').addEventListener('click', () => show(index + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  show(0);
});

// Progressive enhancement: the document stays visible without animation support.
const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealElements.forEach(element => observer.observe(element));
} else revealElements.forEach(element => element.classList.add('in-view'));

const navLinks = [...document.querySelectorAll('.nav-links a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -55% 0px' });
  document.querySelectorAll('#projects, #about, #design, #contact').forEach(section => observer.observe(section));
}

const progress = document.querySelector('.scroll-progress');
let scrollTicking = false;
function updateProgress() {
  const max = root.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
  scrollTicking = false;
}
addEventListener('scroll', () => {
  if (!scrollTicking) {
    requestAnimationFrame(updateProgress);
    scrollTicking = true;
  }
}, { passive: true });
addEventListener('resize', updateProgress);
updateProgress();

let toastTimeout;
document.getElementById('copyEmail').addEventListener('click', async () => {
  const toast = document.getElementById('toast');
  try {
    await navigator.clipboard.writeText('arais.jomar@dnsc.edu.ph');
    toast.textContent = 'Email address copied. Let’s talk!';
  } catch (_) { toast.textContent = 'Email me at arais.jomar@dnsc.edu.ph'; }
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 3500);
});
document.getElementById('year').textContent = new Date().getFullYear();
