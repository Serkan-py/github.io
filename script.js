(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Hero yazısı ilk kareyi rahat bırakır; sonra yumuşakça görünür.
  const heroCopy = document.querySelector('.hero-copy');
  if (reduced.matches) heroCopy?.classList.add('is-revealed');
  else window.setTimeout(() => heroCopy?.classList.add('is-revealed'), 1900);

  // İçerik görünürlük animasyonları.
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

  // Çok düşük seviyeli derinlik/parallax.
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

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking || window.innerWidth < 768) return;
      ticking = true;
      requestAnimationFrame(() => {
        const hero = document.querySelector('.hero-stage');
        if (hero) {
          const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(hero.offsetHeight, 1)));
          root.style.setProperty('--hero-scroll', progress.toFixed(3));
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // Video: yalnızca oynat / duraklat. Video bittiğinde oynat simgesi görünür.
  const video = document.querySelector('.couple-video');
  const scene = document.querySelector('.meeting-scene');
  const endPoster = document.querySelector('.scene-end-poster');
  const toggle = document.querySelector('[data-video-toggle]');
  const videoIcon = toggle?.querySelector('[data-video-icon]');

  const setIcon = state => {
    if (!toggle) return;
    // Bir SVG / bir path: aynı anda iki simgenin görünmesi mümkün değil.
    videoIcon?.setAttribute('d', state === 'pause'
      ? 'M7 5h4v14H7V5Zm6 0h4v14h-4V5Z'
      : 'M8 5.5v13l10-6.5-10-6.5Z');
    const label = state === 'pause' ? 'Videoyu duraklat'
      : video?.ended ? 'Videoyu yeniden oynat' : 'Videoyu oynat';
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  };

  if (video) {
    const play = async () => {
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
    video.addEventListener('play', () => {
      scene?.classList.add('is-started');
      setIcon('pause');
    });
    video.addEventListener('pause', () => {
      if (!video.ended) setIcon('play');
    });
    video.addEventListener('ended', () => {
      endPoster?.classList.add('is-visible');
      setIcon('play');
    });
    video.addEventListener('error', () => {
      video.hidden = true;
      scene?.classList.remove('is-started');
      if (toggle) toggle.hidden = true;
    });

    toggle?.addEventListener('click', () => {
      if (video.paused || video.ended) play();
      else video.pause();
    });

    let resume = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        resume = !video.paused && !video.ended;
        video.pause();
      } else if (resume && !reduced.matches) {
        resume = false;
        play();
      }
    });

    if (reduced.matches) setIcon('play');
    else play();
  }

  // Müzik açık tercih edilir. Tarayıcı sesli otomatik oynatmayı engellerse
  // ilk gerçek tıklama/klavye etkileşimi yeniden dener. Kullanıcının kapatma
  // tercihi korunur; sonraki tıklamalar müziği kendiliğinden açmaz.
  const music = document.querySelector('#wedding-music');
  const musicToggle = document.querySelector('[data-music-toggle]');
  let musicEnabled = true;
  let musicShouldResume = false;

  const setMusicUI = () => {
    if (!music || !musicToggle) return;
    const playing = !music.paused && !music.ended;
    const label = playing ? 'Müziği kapat' : 'Müziği aç';
    musicToggle.classList.toggle('is-playing', playing);
    musicToggle.setAttribute('aria-pressed', String(playing));
    musicToggle.setAttribute('aria-label', label);
    const text = musicToggle.querySelector('.music-control-label');
    if (text) text.textContent = label;
  };

  const startMusic = async () => {
    if (!music || !musicEnabled || document.hidden) return false;
    try {
      music.volume = 0.24;
      music.muted = false;
      await music.play();
      // Kullanıcı bekleyen play() isteği sırasında kapatmış olabilir.
      if (!musicEnabled || document.hidden) {
        music.pause();
        setMusicUI();
        return false;
      }
      setMusicUI();
      return true;
    } catch (_) {
      setMusicUI();
      return false;
    }
  };

  if (music && musicToggle) {
    const unlockMusic = event => {
      if (event.target?.closest?.('[data-music-toggle]')) return;
      if (event.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(event.key)) return;
      if (musicEnabled && music.paused && !document.hidden) startMusic();
    };
    document.addEventListener('click', unlockMusic, true);
    document.addEventListener('keydown', unlockMusic, true);

    music.addEventListener('play', () => {
      if (!musicEnabled || document.hidden) music.pause();
      setMusicUI();
    });
    music.addEventListener('pause', setMusicUI);
    music.addEventListener('error', () => {
      musicToggle.hidden = true;
    }, true);

    musicToggle.addEventListener('click', event => {
      event.stopPropagation();
      if (!music.paused) {
        musicEnabled = false;
        musicShouldResume = false;
        music.pause();
        setMusicUI();
      } else {
        musicEnabled = true;
        startMusic();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        musicShouldResume = musicEnabled && !music.paused;
        music.pause();
      } else if (musicShouldResume) {
        musicShouldResume = false;
        startMusic();
      }
    });
    window.addEventListener('pagehide', () => {
      musicShouldResume = musicEnabled && !music.paused;
      music.pause();
    });
    window.addEventListener('pageshow', event => {
      if (event.persisted && musicEnabled && !document.hidden) startMusic();
    });

    // Gecikme yok: sayfa hazır olur olmaz sesli oynatma isteği gönderilir.
    startMusic();
  }

  // Sabit sütunlar: rakam değiştiğinde metin yeniden sıçramaz.
  const countdowns = [...document.querySelectorAll('[data-countdown]')];
  const renderCountdown = card => {
    const target = Date.parse(card.dataset.countdown || '');
    const eventName = card.dataset.eventName || 'Kutlama';
    const out = card.querySelector('[data-countdown-values]');
    const label = card.querySelector('.countdown-label');
    if (!out || !Number.isFinite(target)) return;
    const diff = target - Date.now();
    if (diff <= 0) {
      if (label) label.textContent = eventName;
      out.classList.add('is-complete');
      out.textContent = 'Mutluluğumuzu bizimle paylaştığınız için teşekkür ederiz.';
      return;
    }
    const total = Math.floor(diff / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor(total / 60) % 60;
    const seconds = total % 60;
    if (!out.querySelector('[data-count]')) {
      out.innerHTML = ['Gün', 'Saat', 'Dakika', 'Saniye'].map(unit =>
        `<span><b data-count>00</b><span>${unit}</span></span>`).join('');
    }
    const values = [days, hours, minutes, seconds].map((value, i) =>
      i === 0 ? String(value) : String(value).padStart(2, '0'));
    out.querySelectorAll('[data-count]').forEach((el, i) => {
      if (el.textContent !== values[i]) el.textContent = values[i];
    });
  };
  const tick = () => { if (!document.hidden) countdowns.forEach(renderCountdown); };
  document.addEventListener('visibilitychange', tick);
  tick();
  window.setInterval(tick, 1000);
})();
