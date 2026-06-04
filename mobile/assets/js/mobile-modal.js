(function () {
  var controlSelector = [
    '.js-commentOpen',
    '.js-commentClose',
    '.js-aboutModalOpen',
    '.js-aboutModalClose',
    '.js-favoriteItemModalOpen',
    '.js-favoriteItemModalClose',
    '.js-sectionPosterOpen',
    '.js-sectionPosterClose',
    '.js-aniameModalOpen',
    '.js-aniameModalClose',
    '.js-aniameZoom',
    '.js-aniameZoomClose',
    '.js-graphicModalOpen',
    '.js-graphicModalClose',
    '.js-graphicZoom',
    '.js-graphicZoomClose',
    '.js-photoModalOpen',
    '.js-photoModalClose',
    '.js-photoZoom',
    '.js-photoZoomClose'
  ].join(',');
  var suppressClickUntil = 0;

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function closeAll(selector) {
    var modals = document.querySelectorAll(selector + '.is-open');
    for (var i = 0; i < modals.length; i++) closeModal(modals[i]);
  }

  function setViewer(modal, viewerSelector, imageSelector, src) {
    var viewer = modal ? modal.querySelector(viewerSelector) : null;
    var image = modal ? modal.querySelector(imageSelector) : null;
    if (!viewer || !image || !src) return;
    image.src = src;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function clearViewer(modal, viewerSelector, imageSelector) {
    var viewer = modal ? modal.querySelector(viewerSelector) : null;
    var image = modal ? modal.querySelector(imageSelector) : null;
    if (!viewer) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    if (image) image.removeAttribute('src');
  }

  function setPoster(src) {
    var modal = document.getElementById('section2-poster-modal');
    var image = modal ? modal.querySelector('.posterZoom__img') : null;
    if (!modal || !image || !src) return;
    image.src = src;
    openModal(modal);
  }

  function clearPoster() {
    var modal = document.getElementById('section2-poster-modal');
    var image = modal ? modal.querySelector('.posterZoom__img') : null;
    closeModal(modal);
    if (image) image.removeAttribute('src');
  }

  function leaveNormalLinkAlone(target) {
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!link) return false;
    if (link.closest(controlSelector)) return false;
    var href = link.getAttribute('href') || '';
    return Boolean(href && href !== '#' && href.indexOf('javascript:') !== 0);
  }

  function consume(event) {
    if (event.cancelable !== false) event.preventDefault();
    event.stopImmediatePropagation();
    suppressClickUntil = Date.now() + 650;
  }

  function handle(event) {
    var target = event.target;
    if (!target || !target.closest || leaveNormalLinkAlone(target)) return;

    var opener = target.closest('.js-commentOpen');
    if (opener) {
      openModal(document.getElementById('comment-' + opener.getAttribute('data-comment')));
      consume(event);
      return;
    }

    var commentClose = target.closest('.js-commentClose');
    if (commentClose) {
      closeAll('.commentModal');
      consume(event);
      return;
    }

    var aboutOpen = target.closest('.js-aboutModalOpen');
    if (aboutOpen) {
      openModal(document.getElementById('about-modal'));
      consume(event);
      return;
    }

    var aboutClose = target.closest('.js-aboutModalClose');
    if (aboutClose) {
      closeModal(document.getElementById('about-modal'));
      consume(event);
      return;
    }

    var favoriteOpen = target.closest('.js-favoriteItemModalOpen');
    if (favoriteOpen) {
      openModal(document.getElementById('favorite-modal-' + favoriteOpen.getAttribute('data-favorite-modal')));
      consume(event);
      return;
    }

    var favoriteClose = target.closest('.js-favoriteItemModalClose');
    if (favoriteClose) {
      closeModal(favoriteClose.closest('.favoriteItemModal'));
      consume(event);
      return;
    }

    var posterOpen = target.closest('.js-sectionPosterOpen');
    if (posterOpen) {
      setPoster(posterOpen.getAttribute('data-src'));
      consume(event);
      return;
    }

    var posterClose = target.closest('.js-sectionPosterClose');
    if (posterClose) {
      clearPoster();
      consume(event);
      return;
    }

    var aniameModal = document.getElementById('aniame-modal');
    var aniameOpen = target.closest('.js-aniameModalOpen');
    if (aniameOpen) {
      openModal(aniameModal);
      consume(event);
      return;
    }

    var aniameZoom = target.closest('.js-aniameZoom');
    if (aniameZoom) {
      setViewer(aniameModal, '.aniameModal__viewer', '.aniameModal__viewerImg', aniameZoom.getAttribute('data-src'));
      consume(event);
      return;
    }

    var aniameZoomClose = target.closest('.js-aniameZoomClose');
    if (aniameZoomClose) {
      clearViewer(aniameModal, '.aniameModal__viewer', '.aniameModal__viewerImg');
      consume(event);
      return;
    }

    var aniameClose = target.closest('.js-aniameModalClose');
    if (aniameClose) {
      clearViewer(aniameModal, '.aniameModal__viewer', '.aniameModal__viewerImg');
      closeModal(aniameModal);
      consume(event);
      return;
    }

    var graphicModal = document.getElementById('graphic-design-modal');
    var graphicOpen = target.closest('.js-graphicModalOpen');
    if (graphicOpen) {
      openModal(graphicModal);
      consume(event);
      return;
    }

    var graphicZoom = target.closest('.js-graphicZoom');
    if (graphicZoom) {
      setViewer(graphicModal, '.graphicModal__viewer', '.graphicModal__viewerImg', graphicZoom.getAttribute('data-mobile-src') || graphicZoom.getAttribute('data-src'));
      consume(event);
      return;
    }

    var graphicZoomClose = target.closest('.js-graphicZoomClose');
    if (graphicZoomClose) {
      clearViewer(graphicModal, '.graphicModal__viewer', '.graphicModal__viewerImg');
      consume(event);
      return;
    }

    var graphicClose = target.closest('.js-graphicModalClose');
    if (graphicClose) {
      clearViewer(graphicModal, '.graphicModal__viewer', '.graphicModal__viewerImg');
      closeModal(graphicModal);
      consume(event);
      return;
    }

    var photoModal = document.getElementById('photo-modal');
    var photoOpen = target.closest('.js-photoModalOpen');
    if (photoOpen) {
      openModal(photoModal);
      consume(event);
      return;
    }

    var photoZoom = target.closest('.js-photoZoom');
    if (photoZoom) {
      setViewer(photoModal, '.photoModal__viewer', '.photoModal__viewerImg', photoZoom.getAttribute('data-src'));
      consume(event);
      return;
    }

    var photoZoomClose = target.closest('.js-photoZoomClose');
    if (photoZoomClose) {
      clearViewer(photoModal, '.photoModal__viewer', '.photoModal__viewerImg');
      consume(event);
      return;
    }

    var photoClose = target.closest('.js-photoModalClose');
    if (photoClose) {
      clearViewer(photoModal, '.photoModal__viewer', '.photoModal__viewerImg');
      closeModal(photoModal);
      consume(event);
    }
  }

  if (window.PointerEvent) {
    document.addEventListener('pointerup', function (event) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (event.button !== 0) return;
      handle(event);
    }, true);
  } else {
    document.addEventListener('touchend', handle, true);
  }

  document.addEventListener('click', function (event) {
    if (Date.now() > suppressClickUntil) return;
    var target = event.target;
    if (!target || !target.closest || !target.closest(controlSelector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
