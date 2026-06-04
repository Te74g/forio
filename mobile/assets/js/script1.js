(() => {
  const illusts = [
    { url: "../assets/images/トランジション/panel-01.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-02.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-03.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-04.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-05.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-06.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-07.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-08.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-09.webp", position: "center center" },
    { url: "../assets/images/トランジション/panel-10.webp", position: "center center" },
  ];

  const loadImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

  const shuffle = (items) => {
    const shuffled = items.slice(0);
    for (let index = shuffled.length - 1; index >= 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const current = shuffled[index];
      shuffled[index] = shuffled[randomIndex];
      shuffled[randomIndex] = current;
    }
    return shuffled;
  };

  const wrapper = document.querySelector(".Cover__Wrapper");
  const panels = Array.from(document.querySelectorAll(".Intro__Illust"));
  const signVideo = document.querySelector(".Sign__Video");
  const isPhoneViewport = () => {
    const narrow = window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : window.innerWidth <= 767;
    if (!narrow) return false;
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const hoverNone = window.matchMedia && window.matchMedia("(hover: none)").matches;
    const touchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    const mobileUA = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
    return Boolean(coarse || hoverNone || touchPoints > 0 || mobileUA);
  };
  const revealMain = () => {
    document.body.classList.remove("is-cover-pending");
  };

  if (!wrapper || panels.length === 0) {
    revealMain();
    return;
  }

  const resetPageToTop = () => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.querySelectorAll("#main, .page, .deck-panel, .section").forEach((element) => {
      element.scrollTop = 0;
    });
  };

  if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
    wrapper.classList.add("is-safari");
  }

  const selected = shuffle(illusts).slice(0, 8);

  selected.forEach((illust, index) => {
    const panel = panels[index];
    if (!panel) return;
    panel.style.backgroundImage = `url(${illust.url})`;
    panel.style.backgroundPosition = illust.position;
  });

  const emitCover = () => {
    setTimeout(() => {
      resetPageToTop();
      document.dispatchEvent(new CustomEvent("portfolio:sign-transition"));
      if (signVideo && isPhoneViewport()) {
        signVideo.muted = true;
        signVideo.playsInline = true;
        try { signVideo.currentTime = 0; } catch (error) {}
        const playback = signVideo.play();
        if (playback && playback.catch) playback.catch(() => {});
      }
      wrapper.classList.add("is-emit");
      setTimeout(() => {
        wrapper.classList.add("is-done");
        revealMain();
      }, 3700);
    }, 1000);
  };

  Promise.all([
    ...selected.map((illust) => loadImage(illust.url)),
  ]).then(emitCover).catch(emitCover);
})();

(() => {
  window.addEventListener("load", () => {
    const tiltBoxes = document.querySelectorAll(".tilt-box");
    if (window.innerWidth > 768 && typeof VanillaTilt !== "undefined") {
      VanillaTilt.init(tiltBoxes, { speed: 1e3, reverse: true });
    }

    const heroSection = document.querySelector("#hero");
    const heroBg = document.querySelector(".hero__bg");
    const heroChara = document.querySelector(".hero__chara-wrap");

    if (heroSection && heroBg && heroChara && window.innerWidth > 768) {
      heroSection.addEventListener("mousemove", (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width * 0.5) / rect.width;
        const y = (e.clientY - rect.top - rect.height * 0.5) / rect.height;
        heroBg.style.setProperty("--bg-px", `${(x * -18).toFixed(2)}px`);
        heroBg.style.setProperty("--bg-py", `${(y * -12).toFixed(2)}px`);
        heroChara.style.setProperty("--ch-px", `${(x * 28).toFixed(2)}px`);
        heroChara.style.setProperty("--ch-py", `${(y * 18).toFixed(2)}px`);
      });
      heroSection.addEventListener("mouseleave", () => {
        heroBg.style.setProperty("--bg-px", "0px");
        heroBg.style.setProperty("--bg-py", "0px");
        heroChara.style.setProperty("--ch-px", "0px");
        heroChara.style.setProperty("--ch-py", "0px");
      });
    }
  });
})();
