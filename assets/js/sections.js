(function () {
  var panels = [
    document.getElementById('hero'),
    document.getElementById('profile'),
    document.getElementById('poster-examples'),
    document.getElementById('section5'),
    document.getElementById('section2'),
    document.getElementById('section3'),
    document.getElementById('section4')
  ].filter(Boolean);
  if (!panels.length) return;

  document.documentElement.classList.add('deck-mode');

  var ids = panels.map(function (s) { return s.id; }).filter(Boolean);
  var current = 0;
  var busy = false;
  var touchY = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wheelSteps = 0;
  var wheelDirection = 0;
  var wheelResetTimer = null;
  var wheelStepsNeeded = 10;
  var mouseWheelDeltaThreshold = 80;
  var transitionTimer = null;
  var idleHintTimer = null;
  var idleHint = document.createElement('img');
  var idleHintHost = document.querySelector('#hero .hero__scene') || document.body;
  var section1IntroPlayed = false;
  var section1Intro = document.getElementById('section1-intro-video');
  var section1IntroMedia = section1Intro ? section1Intro.querySelector('video') : null;
  var section1IntroCloseTimer = null;
  idleHint.className = 'deck-idle-hint';
  idleHint.src = 'assets/images/hero/SC.png';
  idleHint.alt = '';
  idleHint.setAttribute('aria-hidden', 'true');
  idleHintHost.appendChild(idleHint);

  panels.forEach(function (panel, index) {
    panel.classList.add('deck-panel');
    panel.setAttribute('data-deck-index', String(index));
  });

  function hideIdleHint() {
    idleHint.classList.remove('is-visible');
  }

  function scheduleIdleHint() {
    if (idleHintTimer) window.clearTimeout(idleHintTimer);
    idleHintTimer = window.setTimeout(function () {
      if (!busy) idleHint.classList.add('is-visible');
    }, 2000);
  }

  function markScrollActivity() {
    hideIdleHint();
    scheduleIdleHint();
  }

  function isModalOpen() {
    return isCoverTransitionActive() || !!document.querySelector('.commentModal.is-open, .aboutModal.is-open, .favoriteItemModal.is-open, .aniameModal.is-open, .graphicModal.is-open, .photoModal.is-open, .articlesModal__viewer.is-open, .posterZoom.is-open, .kt-modal.is-open, .sectionIntroVideo.is-visible');
  }

  function isCoverTransitionActive() {
    var cover = document.querySelector('.Cover__Wrapper');
    return !!cover && !cover.classList.contains('is-done');
  }

  function ignoreDeckInputWhileModalOpen() {
    if (!isModalOpen()) return false;
    hideIdleHint();
    wheelSteps = 0;
    wheelDirection = 0;
    touchY = null;
    return true;
  }

  function consumeDeckInput(event) {
    if (!event) return;
    if (event.cancelable !== false) event.preventDefault();
    event.stopPropagation();
  }

  function resetWheelStep() {
    wheelSteps = 0;
    wheelDirection = 0;
    if (wheelResetTimer) {
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = null;
    }
  }

  function activeLocalScrollPanel() {
    var panel = panels[current];
    if (!panel) return null;
    if (panel.id === 'hero') return null;
    if (panel.scrollHeight <= panel.clientHeight + 2) return null;
    var oy = window.getComputedStyle(panel).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') return null;
    return panel;
  }

  function canScrollPanel(panel, direction) {
    if (!panel) return false;
    if (direction > 0) return panel.scrollTop + panel.clientHeight < panel.scrollHeight - 2;
    return panel.scrollTop > 2;
  }

  function scrollLocalPanel(direction, amount) {
    var panel = activeLocalScrollPanel();
    if (!canScrollPanel(panel, direction)) return false;
    panel.scrollTop += amount;
    hideIdleHint();
    resetWheelStep();
    return true;
  }

  function setActive(id) {
    ids.forEach(function (x) { document.body.classList.remove('is-' + x); });
    document.body.classList.add('is-' + id);
  }

  function resetPanelsToTop() {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    panels.forEach(function (panel) {
      panel.scrollTop = 0;
    });
    var main = document.getElementById('main');
    var page = document.querySelector('.page');
    if (main) main.scrollTop = 0;
    if (page) page.scrollTop = 0;
  }

  function hideSection1Intro() {
    if (!section1Intro) return;
    section1Intro.classList.remove('is-visible');
    if (section1IntroCloseTimer) window.clearTimeout(section1IntroCloseTimer);
    section1IntroCloseTimer = window.setTimeout(function () {
      section1Intro.hidden = true;
      if (section1IntroMedia) {
        section1IntroMedia.pause();
        try { section1IntroMedia.currentTime = 0; } catch (x) {}
      }
      section1IntroCloseTimer = null;
    }, 920);
  }

  function playSection1Intro() {
    if (section1IntroPlayed || reduced || !section1Intro || !section1IntroMedia) return;
    section1IntroPlayed = true;
    if (section1IntroCloseTimer) {
      window.clearTimeout(section1IntroCloseTimer);
      section1IntroCloseTimer = null;
    }
    section1Intro.hidden = false;
    section1IntroMedia.muted = true;
    section1IntroMedia.playsInline = true;
    section1IntroMedia.playbackRate = 1.2;
    try { section1IntroMedia.currentTime = 0; } catch (x) {}
    window.requestAnimationFrame(function () {
      section1Intro.classList.add('is-visible');
      var playback = section1IntroMedia.play();
      if (playback && playback.catch) {
        playback.catch(function () {
          window.setTimeout(hideSection1Intro, 360);
        });
      }
    });
    var duration = Number.isFinite(section1IntroMedia.duration) && section1IntroMedia.duration > 0 ? section1IntroMedia.duration : 5.15;
    window.setTimeout(hideSection1Intro, Math.min(Math.max((duration / 1.2) * 1000 + 700, 4700), 6200));
  }

  if (section1IntroMedia) {
    section1IntroMedia.addEventListener('ended', function () {
      window.setTimeout(hideSection1Intro, 180);
    });
  }

  function hydrateDeferred(panel) {
    panel.querySelectorAll('img[data-defer]').forEach(function (img) {
      img.src = img.getAttribute('data-defer');
      img.removeAttribute('data-defer');
    });
  }

  function show(index) {
    panels.forEach(function (panel, i) {
      panel.classList.toggle('is-active', i === index);
      panel.classList.toggle('is-before', i < index);
      panel.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
    hydrateDeferred(panels[index]);
    setActive(panels[index].id);
  }

  document.addEventListener('portfolio:sign-transition', function () {
    resetPanelsToTop();
    resetWheelStep();
    touchY = null;
    if (transitionTimer) {
      window.clearTimeout(transitionTimer);
      transitionTimer = null;
    }
    busy = false;
    current = 0;
    clearTransition();
    show(current);
  });

  function clearTransition() {
    document.documentElement.classList.remove('deck-blur', 'deck-transitioning', 'deck-forward', 'deck-back');
    panels.forEach(function (panel) {
      panel.classList.remove('is-entering', 'is-exiting');
    });
  }

  function go(next) {
    if (busy) return;
    next = Math.max(0, Math.min(panels.length - 1, next));
    if (next === current) return;
    if (reduced) {
      current = next;
      show(current);
      return;
    }
    var previous = current;
    var direction = next > current ? 1 : -1;
    if (transitionTimer) window.clearTimeout(transitionTimer);
    busy = true;
    resetWheelStep();
    hideIdleHint();
    clearTransition();
    document.documentElement.classList.add('deck-blur', 'deck-transitioning', direction > 0 ? 'deck-forward' : 'deck-back');
    panels[previous].classList.add('is-exiting');
    panels[next].classList.add('is-entering');
    current = next;
    show(current);
    if (panels[current] && panels[current].id === 'profile') playSection1Intro();
    transitionTimer = window.setTimeout(function () {
      clearTransition();
      busy = false;
      transitionTimer = null;
      scheduleIdleHint();
    }, 540);
  }

  window.addEventListener('wheel', function (event) {
    if (ignoreDeckInputWhileModalOpen()) return;
    if (busy) {
      consumeDeckInput(event);
      return;
    }
    if (Math.abs(event.deltaY) < 8) return;
    var direction = event.deltaY > 0 ? 1 : -1;
    if (scrollLocalPanel(direction, event.deltaY)) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    markScrollActivity();
    if (isMouseWheelEvent(event)) {
      resetWheelStep();
      go(current + direction);
      return;
    }
    if (direction !== wheelDirection) {
      wheelDirection = direction;
      wheelSteps = 0;
    }
    wheelSteps += 1;
    if (wheelResetTimer) window.clearTimeout(wheelResetTimer);
    wheelResetTimer = window.setTimeout(function () {
      wheelSteps = 0;
      wheelDirection = 0;
    }, 700);
    if (wheelSteps < wheelStepsNeeded) return;
    wheelSteps = 0;
    wheelDirection = 0;
    go(current + direction);
  }, { passive: false });

  function isMouseWheelEvent(event) {
    return event.deltaMode !== 0 || Math.abs(event.deltaY) >= mouseWheelDeltaThreshold;
  }

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented) return;
    if (busy) {
      consumeDeckInput(event);
      return;
    }
    if (isModalOpen()) return;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].indexOf(event.key) !== -1) {
      if (event.key === 'ArrowDown' && scrollLocalPanel(1, 72)) { event.preventDefault(); return; }
      if ((event.key === 'PageDown' || event.key === ' ') && scrollLocalPanel(1, window.innerHeight * 0.82)) { event.preventDefault(); return; }
      event.preventDefault();
      markScrollActivity();
      go(current + 1);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].indexOf(event.key) !== -1) {
      if (event.key === 'ArrowUp' && scrollLocalPanel(-1, -72)) { event.preventDefault(); return; }
      if (event.key === 'PageUp' && scrollLocalPanel(-1, -window.innerHeight * 0.82)) { event.preventDefault(); return; }
      event.preventDefault();
      markScrollActivity();
      go(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      markScrollActivity();
      go(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      markScrollActivity();
      go(panels.length - 1);
    }
  });

  window.addEventListener('touchstart', function (event) {
    if (busy || ignoreDeckInputWhileModalOpen()) {
      touchY = null;
      return;
    }
    markScrollActivity();
    touchY = event.touches && event.touches.length ? event.touches[0].clientY : null;
  }, { passive: true });

  window.addEventListener('touchmove', function (event) {
    if (ignoreDeckInputWhileModalOpen()) return;
    if (busy) {
      consumeDeckInput(event);
      return;
    }
    if (touchY === null || !event.touches || !event.touches.length) return;
    var diff = touchY - event.touches[0].clientY;
    if (Math.abs(diff) < 42) return;
    if (scrollLocalPanel(diff > 0 ? 1 : -1, diff)) {
      event.preventDefault();
      touchY = event.touches[0].clientY;
      return;
    }
    event.preventDefault();
    markScrollActivity();
    go(current + (diff > 0 ? 1 : -1));
    touchY = null;
  }, { passive: false });

  show(current);
  scheduleIdleHint();
})();

(function () {
  function open(id) { var m = document.getElementById('comment-' + id); if (m) { m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); document.documentElement.style.overflow = 'hidden'; } }
  function closeAll() { var ms = document.querySelectorAll('.commentModal.is-open'); for (var i = 0; i < ms.length; i++) { ms[i].classList.remove('is-open'); ms[i].setAttribute('aria-hidden', 'true'); } document.documentElement.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var o = t.closest ? t.closest('.js-commentOpen') : null;
    if (o) { e.preventDefault(); open(o.getAttribute('data-comment')); return; }
    if (t.closest && t.closest('.js-commentClose')) { closeAll(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();

(function () {
  var modal = document.getElementById('about-modal');
  if (!modal) return;

  function open() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.closest && target.closest('.js-aboutModalOpen')) {
      e.preventDefault();
      open();
      return;
    }
    if (target.closest && target.closest('.js-aboutModalClose')) close();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.js-aboutModalOpen')) {
      e.preventDefault();
      open();
      return;
    }
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();

(function () {
  function getModal(id) {
    return id ? document.getElementById('favorite-modal-' + id) : null;
  }

  function open(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function closeAll() {
    var modals = document.querySelectorAll('.favoriteItemModal.is-open');
    for (var i = 0; i < modals.length; i++) close(modals[i]);
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var opener = target.closest ? target.closest('.js-favoriteItemModalOpen') : null;
    if (opener) {
      e.preventDefault();
      open(getModal(opener.getAttribute('data-favorite-modal')));
      return;
    }
    if (target.closest && target.closest('.js-favoriteItemModalClose')) {
      close(target.closest('.favoriteItemModal'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAll();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.closest && e.target.closest('.js-favoriteItemModalOpen')) {
      e.preventDefault();
      open(getModal(e.target.closest('.js-favoriteItemModalOpen').getAttribute('data-favorite-modal')));
    }
  });
})();

(function () {
  var modal = document.getElementById('section2-poster-modal');
  if (!modal) return;
  var img = modal.querySelector('.posterZoom__img');

  function open(src) {
    if (!src || !img) return;
    img.src = src;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (img) img.removeAttribute('src');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var opener = target.closest ? target.closest('.js-sectionPosterOpen') : null;
    if (opener) {
      e.preventDefault();
      open(opener.getAttribute('data-src'));
      return;
    }
    if (target.closest && target.closest('.js-sectionPosterClose')) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();

(function () {
  var modal = document.getElementById('aniame-modal');
  if (!modal) return;
  var viewer = modal.querySelector('.aniameModal__viewer');
  var viewerImg = modal.querySelector('.aniameModal__viewerImg');

  function open() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    closeZoom();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function openZoom(src) {
    if (!viewer || !viewerImg || !src) return;
    viewerImg.src = src;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function closeZoom() {
    if (!viewer || !viewerImg) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.removeAttribute('src');
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.closest && target.closest('.js-aniameModalOpen')) {
      e.preventDefault();
      open();
      return;
    }
    var zoom = target.closest ? target.closest('.js-aniameZoom') : null;
    if (zoom) {
      e.preventDefault();
      openZoom(zoom.getAttribute('data-src'));
      return;
    }
    if (target.closest && target.closest('.js-aniameZoomClose')) {
      e.preventDefault();
      closeZoom();
      return;
    }
    if (target.closest && target.closest('.js-aniameModalClose')) {
      e.preventDefault();
      close();
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !modal.classList.contains('is-open')) return;
    if (viewer && viewer.classList.contains('is-open')) {
      closeZoom();
      return;
    }
    close();
  });
})();

(function () {
  var viewer = document.querySelector('.articlesModal__viewer');
  if (!viewer) return;
  var viewerImg = viewer.querySelector('.articlesModal__viewerImg');

  function openZoom(src) {
    if (!viewerImg || !src) return;
    viewerImg.src = src;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeZoom() {
    if (!viewerImg) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.removeAttribute('src');
    document.documentElement.style.overflow = '';
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var zoom = target.closest ? target.closest('.js-articlesZoom') : null;
    if (zoom) {
      e.preventDefault();
      openZoom(zoom.getAttribute('data-src'));
      return;
    }
    if (target.closest && target.closest('.js-articlesZoomClose')) {
      e.preventDefault();
      closeZoom();
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && viewer.classList.contains('is-open')) closeZoom();
  });
})();

(function () {
  var section = document.getElementById('section5');
  if (!section) return;
  var indexView = section.querySelector('.mc-indexView');
  var articles = section.querySelectorAll('.mc-article');
  if (!indexView || !articles.length) return;

  function scrollTop() {
    section.scrollTop = 0;
  }

  function showIndex() {
    for (var i = 0; i < articles.length; i++) articles[i].setAttribute('hidden', '');
    indexView.removeAttribute('hidden');
    scrollTop();
  }

  function showArticle(id) {
    var target = document.getElementById(id);
    if (!target || !target.classList.contains('mc-article')) return;
    indexView.setAttribute('hidden', '');
    for (var i = 0; i < articles.length; i++) {
      if (articles[i] === target) articles[i].removeAttribute('hidden');
      else articles[i].setAttribute('hidden', '');
    }
    scrollTop();
  }

  section.addEventListener('click', function (e) {
    var target = e.target;
    var opener = target.closest ? target.closest('.js-mcOpen') : null;
    if (opener) {
      e.preventDefault();
      showArticle((opener.getAttribute('href') || '').replace('#', ''));
      return;
    }
    if (target.closest && target.closest('.js-mcBack')) {
      e.preventDefault();
      showIndex();
      return;
    }
    if (target.closest && target.closest('.share-area')) {
      e.preventDefault();
    }
  });
})();

(function () {
  var modal = document.getElementById('graphic-design-modal');
  if (!modal) return;
  var viewer = modal.querySelector('.graphicModal__viewer');
  var viewerImg = modal.querySelector('.graphicModal__viewerImg');
  var mobileGifFallbackMedia = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;

  function open() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    closeZoom();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function openZoom(src) {
    if (!viewer || !viewerImg || !src) return;
    viewerImg.src = src;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function getZoomSrc(button) {
    var src = button.getAttribute('data-src');
    if (mobileGifFallbackMedia && mobileGifFallbackMedia.matches) {
      src = button.getAttribute('data-mobile-src') || src;
    }
    return src;
  }

  function closeZoom() {
    if (!viewer || !viewerImg) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.removeAttribute('src');
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.closest && target.closest('.js-graphicModalOpen')) {
      e.preventDefault();
      open();
      return;
    }
    var zoom = target.closest ? target.closest('.js-graphicZoom') : null;
    if (zoom) {
      e.preventDefault();
      openZoom(getZoomSrc(zoom));
      return;
    }
    if (target.closest && target.closest('.js-graphicZoomClose')) {
      e.preventDefault();
      closeZoom();
      return;
    }
    if (target.closest && target.closest('.js-graphicModalClose')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !modal.classList.contains('is-open')) return;
    if (viewer && viewer.classList.contains('is-open')) {
      closeZoom();
      return;
    }
    close();
  });
})();

(function () {
  var modal = document.getElementById('photo-modal');
  if (!modal) return;
  var viewer = modal.querySelector('.photoModal__viewer');
  var viewerImg = modal.querySelector('.photoModal__viewerImg');

  function open() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    closeZoom();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function openZoom(src) {
    if (!viewer || !viewerImg || !src) return;
    viewerImg.src = src;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function closeZoom() {
    if (!viewer || !viewerImg) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewerImg.removeAttribute('src');
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (target.closest && target.closest('.js-photoModalOpen')) {
      e.preventDefault();
      open();
      return;
    }
    var zoom = target.closest ? target.closest('.js-photoZoom') : null;
    if (zoom) {
      e.preventDefault();
      openZoom(zoom.getAttribute('data-src'));
      return;
    }
    if (target.closest && target.closest('.js-photoZoomClose')) {
      e.preventDefault();
      closeZoom();
      return;
    }
    if (target.closest && target.closest('.js-photoModalClose')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !modal.classList.contains('is-open')) return;
    if (viewer && viewer.classList.contains('is-open')) {
      closeZoom();
      return;
    }
    close();
  });
})();

(function () {
  var sc = document.querySelector('.profile-scaler');
  if (!sc) return;
  function set() {
    var vw = document.documentElement.clientWidth || window.innerWidth || 1422;
    var vh = document.documentElement.clientHeight || window.innerHeight || 800;
    var widthRatio = vw <= 1200 ? 0.56 : (vw <= 1500 ? 0.74 : 0.9);
    var heightRatio = vw <= 1200 ? 0.78 : 0.9;
    var W = Math.min(vw * widthRatio, 1920, vh * heightRatio * 1422 / 880);
    if (W > 120) {
      sc.style.width = W + 'px';
      sc.style.height = Math.round(W * 880 / 1422) + 'px';
      sc.style.setProperty('--f', W / 1422);
    }
  }
  if ('ResizeObserver' in window) {
    try { new ResizeObserver(set).observe(sc); } catch (x) {}
  }
  window.addEventListener('resize', set);
  window.addEventListener('load', set);
  if (document.readyState !== 'loading') set();
  document.addEventListener('DOMContentLoaded', set);
})();

(function () {
  var roots = Array.prototype.slice.call(document.querySelectorAll('.event-image-container'));
  if (!roots.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  roots.forEach(function (root) {
    var main = root.querySelector('.event-main-img');
    var bg = root.querySelector('.event-image-bg');
    var progress = root.querySelector('.event-progress-bar');
    var host = root.closest('.event-col-content') || root.parentElement || document;
    var thumbs = Array.prototype.slice.call(host.querySelectorAll('.thumbnail-item'));
    var index = 0;
    var timer = null;

    function resetProgress() {
      if (!progress || reduced) return;
      progress.style.animation = 'none';
      progress.offsetHeight;
      progress.style.animation = '';
    }

    function show(next) {
      if (!thumbs.length || !main) return;
      index = (next + thumbs.length) % thumbs.length;
      var item = thumbs[index];
      var src = item.getAttribute('data-src');
      if (!src) return;

      main.classList.add('is-switching');
      window.setTimeout(function () {
        main.src = src;
        if (main.hasAttribute('data-src')) main.setAttribute('data-src', src);
        if (bg) bg.style.backgroundImage = "url('" + src + "')";
        thumbs.forEach(function (thumb, i) {
          thumb.classList.toggle('is-active', i === index);
        });
        resetProgress();
        main.classList.remove('is-switching');
      }, reduced ? 0 : 120);
    }

    function start() {
      if (timer) window.clearInterval(timer);
      if (reduced || thumbs.length < 2) return;
      timer = window.setInterval(function () {
        show(index + 1);
      }, 7000);
    }

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        show(i);
        start();
      });
    });

    start();
  });
})();

(function () {
  var section = document.getElementById('poster-examples');
  if (!section) return;

  var panels = Array.prototype.slice.call(section.querySelectorAll('[data-poster-panel]'));
  var thumbs = Array.prototype.slice.call(section.querySelectorAll('[data-poster-target]'));
  var notes = Array.prototype.slice.call(section.querySelectorAll('[data-poster-note]'));
  var stage = section.querySelector('.posterExamples__posterStage');
  var index = 0;
  var shineTimer = null;
  var touchStartX = null;
  var touchStartY = null;

  function show(next) {
    if (!panels.length) return;
    index = Math.max(0, Math.min(panels.length - 1, next));
    panels.forEach(function (panel, i) {
      var active = i === index;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      panel.setAttribute('tabindex', active ? '0' : '-1');
    });
    thumbs.forEach(function (thumb) {
      thumb.classList.toggle('is-active', thumb.getAttribute('data-poster-target') === String(index));
    });
    notes.forEach(function (note) {
      note.classList.toggle('is-active', note.getAttribute('data-poster-note') === String(index));
    });
    if (stage) {
      stage.classList.remove('is-shining');
      stage.offsetWidth;
      stage.classList.add('is-shining');
      if (shineTimer) window.clearTimeout(shineTimer);
      shineTimer = window.setTimeout(function () {
        stage.classList.remove('is-shining');
        shineTimer = null;
      }, 760);
    }
  }

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      show(Number(thumb.getAttribute('data-poster-target')) || 0);
    });
  });

  if (stage) {
    stage.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaY) < 16) return;
      var next = index + (event.deltaY > 0 ? 1 : -1);
      if (next < 0 || next >= panels.length) return;
      event.preventDefault();
      event.stopPropagation();
      show(next);
    }, { passive: false });

    stage.addEventListener('touchstart', function (event) {
      var touch = event.touches && event.touches.length ? event.touches[0] : null;
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    stage.addEventListener('touchend', function (event) {
      var touch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;
      if (!touch || touchStartX === null || touchStartY === null) return;
      var dx = touch.clientX - touchStartX;
      var dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dy) < 42 || Math.abs(dy) < Math.abs(dx) * 1.1) return;
      show(index + (dy < 0 ? 1 : -1));
    }, { passive: true });

    stage.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + 1);
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        show(index - 1);
      }
    });
  }

  show(0);
})();

(function () {
  var roots = Array.prototype.slice.call(document.querySelectorAll('.js-photoRenovate'));
  if (!roots.length) return;

  roots.forEach(function (root) {
    var section = root.closest('.section3--photo-gallery');
    var media = section ? section.querySelector('.p-renovate-media__image') : null;
    var track = root.querySelector('.slick-track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.p-renovate-slider__item'));
    var prev = section ? section.querySelector('.js-photoRenovatePrev') : null;
    var next = section ? section.querySelector('.js-photoRenovateNext') : null;
    var index = 0;
    var timer = null;
    var flashTimer = null;
    var swipeStartX = null;
    var swipeStartY = null;
    var swipeLocked = false;
    var swipeSuppressClick = false;
    var swipeDistance = 54;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var notes = section ? Array.prototype.slice.call(section.querySelectorAll('[data-poster-note]')) : [];

  function apply() {
    if (!track || !slides.length) return;
    track.style.transform = 'translate3d(' + (-index * 100) + '%,0,0)';
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle('slick-current', active);
      slide.classList.toggle('slick-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      slide.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (prev) {
      prev.classList.toggle('slick-disabled', index === 0);
      prev.setAttribute('aria-disabled', index === 0 ? 'true' : 'false');
    }
    if (next) {
      next.classList.toggle('slick-disabled', index === slides.length - 1);
      next.setAttribute('aria-disabled', index === slides.length - 1 ? 'true' : 'false');
    }
    notes.forEach(function (note) {
      note.classList.toggle('is-active', note.getAttribute('data-poster-note') === String(index));
    });
  }

  function triggerFlash() {
    if (!media || reduced) return;
    media.classList.remove('is-photo-flashing');
    media.offsetWidth;
    media.classList.add('is-photo-flashing');
    if (flashTimer) window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () {
      media.classList.remove('is-photo-flashing');
      flashTimer = null;
    }, 620);
  }

  function go(nextIndex, options) {
    var nextPhotoIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    var changed = nextPhotoIndex !== index;
    index = nextPhotoIndex;
    apply();
    if (changed && (!options || options.flash !== false)) triggerFlash();
  }

    function start() {
      if (timer) window.clearInterval(timer);
      if (reduced || slides.length < 2) return;
      timer = window.setInterval(function () {
        go(index >= slides.length - 1 ? 0 : index + 1);
      }, 5200);
  }

  function stop() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  }

  function beginSwipe(point) {
    if (!point || slides.length < 2) return;
    swipeStartX = point.clientX;
    swipeStartY = point.clientY;
    swipeLocked = false;
  }

  function clearSwipe() {
    swipeStartX = null;
    swipeStartY = null;
    swipeLocked = false;
  }

  function moveSwipe(point, event) {
    if (swipeStartX === null || !point) return;
    var dx = point.clientX - swipeStartX;
    var dy = point.clientY - swipeStartY;
    if (!swipeLocked && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      swipeLocked = true;
      stop();
    }
    if (!swipeLocked) return;
    if (event && event.cancelable !== false) event.preventDefault();
    if (event) event.stopPropagation();
  }

  function endSwipe(point, event) {
    if (swipeStartX === null || !point) {
      clearSwipe();
      return;
    }
    var dx = point.clientX - swipeStartX;
    var dy = point.clientY - swipeStartY;
    if (swipeLocked && Math.abs(dx) >= swipeDistance && Math.abs(dx) > Math.abs(dy)) {
      if (event && event.cancelable !== false) event.preventDefault();
      if (event) event.stopPropagation();
      go(index + (dx < 0 ? 1 : -1));
      start();
      swipeSuppressClick = true;
      window.setTimeout(function () {
        swipeSuppressClick = false;
      }, 180);
    }
    clearSwipe();
  }

  if (prev) {
    prev.addEventListener('click', function () {
      if (index === 0) return;
      go(index - 1);
      start();
    });
  }

  if (next) {
    next.addEventListener('click', function () {
      if (index >= slides.length - 1) return;
      go(index + 1);
      start();
    });
  }

  slides.forEach(function (slide, i) {
    slide.addEventListener('click', function () {
      go(i);
    });
  });

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('touchstart', function (event) {
    beginSwipe(event.touches && event.touches.length ? event.touches[0] : null);
  }, { passive: true });
  root.addEventListener('touchmove', function (event) {
    moveSwipe(event.touches && event.touches.length ? event.touches[0] : null, event);
  }, { passive: false });
  root.addEventListener('touchend', function (event) {
    endSwipe(event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null, event);
  }, { passive: false });
  root.addEventListener('touchcancel', clearSwipe);
  root.addEventListener('click', function (event) {
    if (!swipeSuppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

    apply();
    start();
  });
})();

(function () {
  var normalStampSources = [
    'assets/images/stanp/stamp-01.png',
    'assets/images/stanp/stamp-02.png',
    'assets/images/stanp/stamp-03.png',
    'assets/images/stanp/stamp-04.png',
    'assets/images/stanp/stamp-05.png',
    'assets/images/stanp/stamp-06.png',
    'assets/images/stanp/stamp-07.png',
    'assets/images/stanp/stamp-08.png',
    'assets/images/stanp/stamp-09.png',
    'assets/images/stanp/stamp-10.png',
    'assets/images/stanp/stamp-11.png',
    'assets/images/stanp/stamp-12.png',
    'assets/images/stanp/stamp-13.png',
    'assets/images/stanp/stamp-14.png',
    'assets/images/stanp/stamp-15.png',
    'assets/images/stanp/stamp-16.png',
    'assets/images/stanp/stamp-17.png'
  ];
  var memeStampSources = [
    'assets/images/stanp/meme/meme-01.png',
    'assets/images/stanp/meme/meme-02.png',
    'assets/images/stanp/meme/meme-03.png',
    'assets/images/stanp/meme/meme-04.png',
    'assets/images/stanp/meme/meme-05.png',
    'assets/images/stanp/meme/meme-06.png',
    'assets/images/stanp/meme/meme-07.png',
    'assets/images/stanp/meme/meme-08.png',
    'assets/images/stanp/meme/meme-09.png',
    'assets/images/stanp/meme/meme-10.png',
    'assets/images/stanp/meme/meme-11.png',
    'assets/images/stanp/meme/meme-12.png'
  ];
  var trueWorldStampSources = [
    'assets/images/stanp/meme true world/true-world-01.png',
    'assets/images/stanp/meme true world/true-world-02.png',
    'assets/images/stanp/meme true world/true-world-03.png',
    'assets/images/stanp/meme true world/true-world-04.png',
    'assets/images/stanp/meme true world/true-world-05.png',
    'assets/images/stanp/meme true world/true-world-06.png',
    'assets/images/stanp/meme true world/true-world-07.png',
    'assets/images/stanp/meme true world/true-world-08.png',
    'assets/images/stanp/meme true world/true-world-09.png',
    'assets/images/stanp/meme true world/true-world-10.png'
  ];
  var tiltValues = ['-7deg', '4deg', '-2deg', '8deg', '-5deg', '3deg'];
  var sourceIndex = 0;
  var sourceRounds = 0;
  var memeIndex = 0;
  var rareMemeCount = 0;
  var rareMemeStartRounds = 5;
  var rareMemeInterval = 24;
  var trueWorldIndex = 0;
  var trueWorldCount = 0;
  var trueWorldInterval = 6;
  var stampClickCount = 0;
  var effectStep = 0;
  var tiltIndex = 0;
  var layer = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchLikeMedia = window.matchMedia ? window.matchMedia('(hover: none), (pointer: coarse)') : null;
  var interactiveSelector = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    'summary',
    'video',
    'canvas',
    '[role="button"]',
    '[tabindex]',
    '[data-src]',
    '[data-comment]',
    '[data-favorite-modal]',
    '.js-aboutModalOpen',
    '.js-commentClose',
    '.js-aboutModalClose',
    '.js-favoriteItemModalClose',
    '.js-aniameModalClose',
    '.js-aniameZoom',
    '.js-aniameZoomClose',
    '.js-graphicModalClose',
    '.js-graphicZoom',
    '.js-graphicZoomClose',
    '.js-photoModalClose',
    '.js-photoZoom',
    '.js-photoZoomClose',
    '.js-articlesZoom',
    '.js-articlesZoomClose',
    '.js-sectionPosterOpen',
    '.js-sectionPosterClose',
    '.thumbnail-item'
  ].join(',');
  var tapControlSelector = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    'summary',
    'video',
    'canvas',
    '[role="button"]',
    '[data-src]',
    '[data-comment]',
    '[data-favorite-modal]',
    '.js-aboutModalOpen',
    '.js-commentClose',
    '.js-aboutModalClose',
    '.js-favoriteItemModalClose',
    '.js-aniameModalClose',
    '.js-aniameZoom',
    '.js-aniameZoomClose',
    '.js-graphicModalClose',
    '.js-graphicZoom',
    '.js-graphicZoomClose',
    '.js-photoModalClose',
    '.js-photoZoom',
    '.js-photoZoomClose',
    '.js-articlesZoom',
    '.js-articlesZoomClose',
    '.js-sectionPosterOpen',
    '.js-sectionPosterClose',
    '.thumbnail-item'
  ].join(',');
  var overlaySelector = [
    '.commentModal.is-open',
    '.aboutModal.is-open',
    '.favoriteItemModal.is-open',
    '.aniameModal.is-open',
    '.graphicModal.is-open',
    '.photoModal.is-open',
    '.articlesModal__viewer.is-open',
    '.posterZoom.is-open',
    '.kt-modal.is-open',
    '.sectionIntroVideo.is-visible'
  ].join(',');
  var modalPanelSelector = [
    '.commentModal__panel',
    '.aboutModal__panel',
    '.favoriteItemModal__panel',
    '.aniameModal__panel',
    '.graphicModal__panel',
    '.photoModal__panel',
    '.posterZoom__stage',
    '.kt-modal'
  ].join(',');
  var modalControlSelector = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    '[role="button"]',
    '[tabindex]',
    '[data-src]',
    '.js-commentClose',
    '.js-aboutModalClose',
    '.js-favoriteItemModalClose',
    '.js-aniameModalClose',
    '.js-graphicModalClose',
    '.js-photoModalClose',
    '.js-photoZoom',
    '.js-photoZoomClose',
    '.js-articlesZoom',
    '.js-articlesZoomClose'
  ].join(',');

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'clickStampLayer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  function createNode(className) {
    var node = document.createElement('span');
    node.className = className;
    return node;
  }

  function nextStampSource() {
    var source;
    stampClickCount += 1;
    if (stampClickCount > 100 && trueWorldStampSources.length) {
      trueWorldCount += 1;
      if (trueWorldCount >= trueWorldInterval) {
        trueWorldCount = 0;
        source = trueWorldStampSources[trueWorldIndex];
        trueWorldIndex = trueWorldIndex >= trueWorldStampSources.length - 1 ? 0 : trueWorldIndex + 1;
        return source;
      }
    }
    if (sourceRounds >= rareMemeStartRounds && memeStampSources.length) {
      rareMemeCount += 1;
      if (rareMemeCount >= rareMemeInterval) {
        rareMemeCount = 0;
        source = memeStampSources[memeIndex];
        memeIndex = memeIndex >= memeStampSources.length - 1 ? 0 : memeIndex + 1;
        return source;
      }
    }
    source = normalStampSources[sourceIndex];
    sourceIndex += 1;
    if (sourceIndex >= normalStampSources.length) {
      sourceIndex = 0;
      sourceRounds += 1;
    }
    return source;
  }

  function nextTilt() {
    var tilt = tiltValues[tiltIndex];
    tiltIndex = tiltIndex >= tiltValues.length - 1 ? 0 : tiltIndex + 1;
    return tilt;
  }

  function canStamp(event) {
    if (reduced || !event || event.defaultPrevented || event.button !== 0) return false;
    if (document.documentElement.classList.contains('deck-transitioning')) return false;
    var target = event.target;
    if (!target || !target.closest) return true;
    if (document.querySelector(overlaySelector)) return false;
    if (target.closest('.Cover__Wrapper')) return false;
    if (target.closest('#section3 .photo-renovate__stamp')) return true;
    if ((isTouchLikeClick(event) || isMobileViewport()) && isTapControlEvent(event, target)) return false;
    if (target.closest(interactiveSelector)) return false;
    return true;
  }

  function isTouchLikeClick(event) {
    return Boolean(
      (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) ||
      (touchLikeMedia && touchLikeMedia.matches)
    );
  }

  function isTapControlEvent(event, target) {
    if (target && target.closest && target.closest(tapControlSelector)) return true;
    if (!event || typeof document.elementFromPoint !== 'function') return false;
    var pointTarget = document.elementFromPoint(event.clientX, event.clientY);
    return Boolean(pointTarget && pointTarget.closest && pointTarget.closest(tapControlSelector));
  }

  function isMobileViewport() {
    return window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth <= 767;
  }

  function addSnow(stage) {
    var particles = createNode('clickStamp__snowfield');
    for (var i = 0; i < 8; i += 1) {
      var particle = createNode('clickStamp__flake');
      particle.style.setProperty('--angle', (45 * i) + 'deg');
      particle.style.setProperty('--delay', (0.08 + i * 0.035).toFixed(3) + 's');
      particles.appendChild(particle);
    }
    stage.appendChild(particles);
  }

  function addStars(stage) {
    var field = createNode('clickStamp__starfield');
    for (var i = 0; i < 7; i += 1) {
      var star = createNode('clickStamp__starParticle');
      star.style.setProperty('--angle', (Math.floor(360 / 7) * i) + 'deg');
      star.style.setProperty('--delay', (0.12 + i * 0.045).toFixed(3) + 's');
      field.appendChild(star);
    }
    stage.appendChild(field);
  }

  function addPaws(stage) {
    var field = createNode('clickStamp__pawfield');
    for (var i = 0; i < 6; i += 1) {
      var paw = createNode('clickStamp__pawParticle');
      paw.style.setProperty('--angle', (60 * i + 12) + 'deg');
      paw.style.setProperty('--delay', (0.1 + i * 0.055).toFixed(3) + 's');
      field.appendChild(paw);
    }
    stage.appendChild(field);
  }

  function addLeaves(stage) {
    var field = createNode('clickStamp__leaffield');
    for (var i = 0; i < 7; i += 1) {
      var leaf = createNode('clickStamp__leafParticle');
      leaf.style.setProperty('--angle', (Math.floor(360 / 7) * i + 8) + 'deg');
      leaf.style.setProperty('--delay', (0.08 + i * 0.042).toFixed(3) + 's');
      field.appendChild(leaf);
    }
    stage.appendChild(field);
  }

  function addShutter(stage) {
    var flash = createNode('clickStamp__shutterFlash');
    var field = createNode('clickStamp__shutterLines');
    for (var i = 0; i < 5; i += 1) {
      var line = createNode('clickStamp__shutterLine');
      line.style.setProperty('--angle', (72 * i) + 'deg');
      line.style.setProperty('--delay', (0.04 + i * 0.035).toFixed(3) + 's');
      field.appendChild(line);
    }
    stage.appendChild(flash);
    stage.appendChild(field);
  }

  function addLetters(stage) {
    var field = createNode('clickStamp__letterfield');
    for (var i = 0; i < 6; i += 1) {
      var paper = createNode('clickStamp__letterParticle');
      paper.style.setProperty('--angle', (60 * i + 20) + 'deg');
      paper.style.setProperty('--delay', (0.1 + i * 0.045).toFixed(3) + 's');
      field.appendChild(paper);
    }
    stage.appendChild(field);
  }

  function activeSectionId(target) {
    if (target && target.closest) {
      var panel = target.closest('.deck-panel');
      if (panel && panel.id) return panel.id;
    }
    var active = document.querySelector('.deck-panel.is-active');
    return active && active.id ? active.id : '';
  }

  function stampContextForEvent(event) {
    var target = event && event.target;
    if (target && target.closest) {
      if (target.closest('.photoModal, #section3')) return 'shutter';
      if (target.closest('.aniameModal, #section2')) return 'leaf';
      if (target.closest('.section4--closing, #section4')) return 'letter';
    }
    var id = activeSectionId(target);
    if (id === 'section3') return 'shutter';
    if (id === 'section2') return 'leaf';
    if (id === 'section4') return 'letter';
    return '';
  }

  function canStampInsideOverlay(target) {
    if (!target || !target.closest) return false;
    var panel = target.closest(modalPanelSelector);
    if (!panel) return false;
    return !target.closest(modalControlSelector);
  }

  function nextEffectType() {
    var type = effectStep === 0 ? 'context' : (effectStep === 1 ? 'snow' : 'paw');
    effectStep = effectStep >= 2 ? 0 : effectStep + 1;
    return type;
  }

  function trimLayer() {
    if (!layer) return;
    while (layer.children.length > 10) {
      layer.removeChild(layer.firstElementChild);
    }
  }

  function spawnStamp(event) {
    var context = stampContextForEvent(event) || 'star';
    var effect = nextEffectType();

    var root = document.createElement('div');
    var stage = document.createElement('div');
    var img = document.createElement('img');
    var shine = createNode('clickStamp__shine');

    root.className = 'clickStamp clickStamp--' + effect + ' clickStamp--context-' + context;
    root.style.left = event.clientX + 'px';
    root.style.top = (window.scrollY + event.clientY) + 'px';
    stage.className = 'clickStamp__stage';
    stage.style.setProperty('--stamp-tilt', nextTilt());
    img.className = 'clickStamp__img';
    img.src = nextStampSource();
    img.alt = '';
    img.decoding = 'async';

    if (effect === 'snow') addSnow(stage);
    if (effect === 'paw') addPaws(stage);
    if (effect === 'context' && context === 'star') addStars(stage);
    if (effect === 'context' && context === 'leaf') addLeaves(stage);
    if (effect === 'context' && context === 'shutter') addShutter(stage);
    if (effect === 'context' && context === 'letter') addLetters(stage);

    stage.appendChild(img);
    stage.appendChild(shine);
    root.appendChild(stage);
    ensureLayer().appendChild(root);
    trimLayer();
    window.setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    }, 2700);
  }

  document.addEventListener('click', function (event) {
    if (!canStamp(event)) return;
    spawnStamp(event);
  });
})();

