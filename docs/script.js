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
      if (ticking) return;
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

  // Video: sessiz otomatik oynatma, sekme değişince durma, bitiş karesi.
  const video = document.querySelector('.couple-video');
  const scene = document.querySelector('.meeting-scene');
  const endPoster = document.querySelector('.scene-end-poster');
  const toggle = document.querySelector('[data-video-toggle]');
  const playIcon = document.querySelector('[data-icon-play]');
  const pauseIcon = document.querySelector('[data-icon-pause]');
  const replayIcon = document.querySelector('[data-icon-replay]');
  const videoLabel = document.querySelector('.video-control-label');

  const setIcon = state => {
    if (!toggle) return;
    playIcon.hidden = state !== 'play';
    pauseIcon.hidden = state !== 'pause';
    replayIcon.hidden = state !== 'replay';
    const label = state === 'pause' ? 'Videoyu durdur' : state === 'replay' ? 'Videoyu yeniden başlat' : 'Videoyu başlat';
    toggle.setAttribute('aria-label', label);
    if (videoLabel) videoLabel.textContent = label;
  };

  if (video) {
    const play = async () => {
      try {
        endPoster?.classList.remove('is-visible');
        if (video.ended) video.currentTime = 0;
        await video.play();
      } catch (_) { setIcon('play'); }
    };
    video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.addEventListener('play', () => { scene?.classList.add('is-started'); setIcon('pause'); });
    video.addEventListener('pause', () => { if (!video.ended) setIcon('play'); });
    video.addEventListener('ended', () => { endPoster?.classList.add('is-visible'); setIcon('replay'); });
    video.addEventListener('error', () => { video.style.display = 'none'; if (toggle) toggle.hidden = true; });
    toggle?.addEventListener('click', () => { if (video.ended || video.paused) play(); else video.pause(); });
    let resume = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { resume = !video.paused; video.pause(); }
      else if (resume && !reduced.matches) { resume = false; play(); }
    });
    if (reduced.matches) setIcon('play'); else play();
  }

  // Fon müziği: tarayıcıların sesli autoplay kısıtlarına uygun şekilde
  // ilk kullanıcı etkileşiminde başlar. Düğme ile her zaman açılıp kapatılabilir.
  const music = document.querySelector('#wedding-music');
  const musicToggle = document.querySelector('[data-music-toggle]');
  const musicLabel = musicToggle?.querySelector('.music-control-label');
  const preferredMusicSrc = music?.dataset.preferredSrc || 'audio/indila-love-story.mp3';
  const fallbackMusicSrc = music?.dataset.fallbackSrc || 'audio/fon-muzigi.mp3';
  let triedFallbackMusic = false;
  let musicStarted = false;
  let musicShouldResume = false;

  if (music) {
    music.src = preferredMusicSrc;
    music.load();
  }

  const setMusicUI = playing => {
    if (!musicToggle) return;
    musicToggle.classList.toggle('is-playing', playing);
    musicToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', playing ? 'Müziği kapat' : 'Müziği aç');
    if (musicLabel) musicLabel.textContent = playing ? 'Müziği kapat' : 'Müziği aç';
  };

  const startMusic = async ({ fromGesture = false } = {}) => {
    if (!music) return false;
    try {
      music.volume = 0.24;
      if (!musicStarted) {
        // Önceki davetiye ayarındaki gibi parçanın orta bölümünden başlar.
        const seek = () => {
          const target = 52;
          if (Number.isFinite(music.duration) && music.duration > target + 1) music.currentTime = target;
        };
        if (music.readyState >= 1) seek();
        else music.addEventListener('loadedmetadata', seek, { once: true });
      }
      await music.play();
      musicStarted = true;
      setMusicUI(true);
      return true;
    } catch (_) {
      setMusicUI(false);
      return false;
    }
  };

  const stopMusic = () => {
    if (!music) return;
    music.pause();
    setMusicUI(false);
  };

  if (music && musicToggle) {
    music.addEventListener('play', () => setMusicUI(true));
    music.addEventListener('pause', () => setMusicUI(false));
    music.addEventListener('error', () => {
      if (!triedFallbackMusic && fallbackMusicSrc) {
        triedFallbackMusic = true;
        music.src = fallbackMusicSrc;
        music.load();
        return;
      }
      musicToggle.hidden = true;
    });

    musicToggle.addEventListener('click', async event => {
      event.stopPropagation();
      if (music.paused) await startMusic({ fromGesture: true });
      else stopMusic();
    });

    // Sesli autoplay çoğu telefonda engellenir. İlk dokunma/tıklama/tuş etkileşimi
    // güvenilir kullanıcı jesti olduğu için müziği otomatik başlatır.
    const unlockMusic = async () => {
      const ok = (!musicStarted && music.paused) ? await startMusic({ fromGesture: true }) : true;
      if (ok) {
        document.removeEventListener('pointerdown', unlockMusic, true);
        document.removeEventListener('keydown', unlockMusic, true);
        document.removeEventListener('touchstart', unlockMusic, true);
      }
    };
    document.addEventListener('pointerdown', unlockMusic, { capture: true, passive: true });
    document.addEventListener('touchstart', unlockMusic, { capture: true, passive: true });
    document.addEventListener('keydown', unlockMusic, true);

    // Masaüstünde tarayıcı izin verirse açılışta da dene; engellenirse ilk etkileşim devralır.
    window.setTimeout(() => startMusic(), 900);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        musicShouldResume = !music.paused;
        if (musicShouldResume) music.pause();
      } else if (musicShouldResume) {
        musicShouldResume = false;
        startMusic();
      }
    });
  }

  // Zarif tek satır geri sayımlar.
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
      out.textContent = 'Mutluluğumuzu bizimle paylaştığınız için teşekkür ederiz.';
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
