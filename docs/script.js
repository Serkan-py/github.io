(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Reveal content gently as it enters the viewport.
  const revealItems = document.querySelectorAll('.reveal');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6%' });
    revealItems.forEach(el => observer.observe(el));
  }

  // Restrained hero depth: only a few pixels on desktop and low scroll depth on mobile.
  if (!reduced.matches) {
    let pointerFrame = 0;
    window.addEventListener('pointermove', event => {
      if (window.innerWidth < 768) return;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--pointer-x', x.toFixed(3));
        root.style.setProperty('--pointer-y', y.toFixed(3));
      });
    }, { passive: true });

    let scrollFrame = 0;
    const updateScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        const hero = document.querySelector('.hero-stage');
        if (hero) {
          const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(hero.offsetHeight, 1)));
          root.style.setProperty('--hero-scroll', progress.toFixed(3));
        }
        scrollFrame = 0;
      });
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
  }

  // Hero video: autoplay muted, pause on tab switch, keep a static end frame.
  const video = document.querySelector('.couple-video');
  const scene = document.querySelector('.meeting-scene');
  const endPoster = document.querySelector('.scene-end-poster');
  const errorBox = document.querySelector('.scene-error');
  const toggle = document.querySelector('[data-video-toggle]');
  const playIcon = document.querySelector('[data-icon-play]');
  const pauseIcon = document.querySelector('[data-icon-pause]');
  const replayIcon = document.querySelector('[data-icon-replay]');

  const setIcon = state => {
    if (!toggle) return;
    playIcon.hidden = state !== 'play';
    pauseIcon.hidden = state !== 'pause';
    replayIcon.hidden = state !== 'replay';
    toggle.setAttribute('aria-label', state === 'pause' ? 'Videoyu duraklat' : state === 'replay' ? 'Videoyu yeniden oynat' : 'Videoyu oynat');
  };

  if (video) {
    const startPlayback = async () => {
      try {
        endPoster?.classList.remove('is-visible');
        if (video.ended) video.currentTime = 0;
        await video.play();
      } catch (_) {
        setIcon('play');
      }
    };

    video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('play', () => { scene?.classList.add('is-started'); setIcon('pause'); });
    video.addEventListener('pause', () => { if (!video.ended) setIcon('play'); });
    video.addEventListener('ended', () => { endPoster?.classList.add('is-visible'); setIcon('replay'); });
    video.addEventListener('error', () => { if (errorBox) errorBox.hidden = false; if (toggle) toggle.disabled = true; });

    toggle?.addEventListener('click', () => {
      if (video.ended || video.paused) startPlayback();
      else video.pause();
    });

    let resumeAfterHidden = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { resumeAfterHidden = !video.paused; video.pause(); }
      else if (resumeAfterHidden && !reduced.matches) { resumeAfterHidden = false; startPlayback(); }
    });

    if (reduced.matches) {
      setIcon('play');
    } else {
      startPlayback();
    }
  }

  // Live, elegant inline countdowns.
  const countdowns = [...document.querySelectorAll('[data-countdown]')];
  const renderCountdown = card => {
    const target = Date.parse(card.dataset.countdown || '');
    const eventName = card.dataset.eventName || 'Kutlama';
    const out = card.querySelector('[data-countdown-values]');
    const title = card.querySelector('.countdown-title');
    if (!out || !Number.isFinite(target)) return;
    const diff = target - Date.now();
    if (diff <= 0) {
      out.innerHTML = '<span>Mutluluğumuzu bizimle paylaştığınız için teşekkür ederiz.</span>';
      if (title) title.textContent = eventName;
      return;
    }
    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor(total / 60) % 60;
    const seconds = total % 60;
    out.innerHTML = `<span><b>${days}</b> Gün</span><i>·</i><span><b>${String(hours).padStart(2,'0')}</b> Saat</span><i>·</i><span><b>${String(minutes).padStart(2,'0')}</b> Dakika</span><i>·</i><span><b>${String(seconds).padStart(2,'0')}</b> Saniye</span>`;
  };
  const tick = () => countdowns.forEach(renderCountdown);
  tick();
  window.setInterval(tick, 1000);
})();
