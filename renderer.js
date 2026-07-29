// renderer.js
// Логика поиска и управления плеером (renderer process)
// Использует iTunes Search API (публичный, не требует ключа) для примера.

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');
  const template = document.getElementById('track-template');

  const player = document.getElementById('player');
  const nowTitle = document.getElementById('now-title');
  const nowArtist = document.getElementById('now-artist');
  const nowCover = document.getElementById('now-cover');
  const playControl = document.getElementById('play');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  let tracks = [];
  let currentIndex = -1;

  // Debounce helper
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  async function search(term) {
    if (!term) {
      resultsContainer.innerHTML = '';
      return;
    }

    const q = encodeURIComponent(term);
    // iTunes Search API: returns previewUrl for samples (30s) and artwork
    const url = `https://itunes.apple.com/search?term=${q}&media=music&limit=25`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const items = data.results || [];

      tracks = items
        .filter(i => i.previewUrl) // только треки с preview
        .map((i) => ({
          title: i.trackName || i.collectionName || 'Unknown',
          artist: i.artistName || 'Unknown',
          cover: i.artworkUrl100 ? i.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://via.placeholder.com/400',
          src: i.previewUrl
        }));

      renderResults();
    } catch (err) {
      console.error('Search error', err);
      resultsContainer.innerHTML = '<div class="col-span-3 text-red-400">Ошибка поиска. Попробуйте ещё раз.</div>';
    }
  }

  function renderResults() {
    resultsContainer.innerHTML = '';
    if (tracks.length === 0) {
      resultsContainer.innerHTML = '<div class="col-span-3 text-[var(--muted)]">Ничего не найдено.</div>';
      lucide.createIcons();
      return;
    }

    tracks.forEach((t, idx) => {
      const clone = template.content.cloneNode(true);
      const img = clone.querySelector('img');
      const titleEl = clone.querySelector('.track-title');
      const artistEl = clone.querySelector('.track-artist');
      const btn = clone.querySelector('.play-btn');

      img.src = t.cover;
      titleEl.textContent = t.title;
      artistEl.textContent = t.artist;

      btn.addEventListener('click', () => {
        playTrackAtIndex(idx);
      });

      // Clicking on the card also plays
      const card = clone.querySelector('.card');
      card.addEventListener('click', (e) => {
        // prevent double trigger when clicking play button
        if (e.target.closest('.play-btn')) return;
        playTrackAtIndex(idx);
      });

      resultsContainer.appendChild(clone);
    });

    // Recreate icons for newly added elements
    lucide.createIcons();
  }

  function playTrackAtIndex(idx) {
    if (idx < 0 || idx >= tracks.length) return;
    currentIndex = idx;
    const t = tracks[idx];
    setNowPlaying(t);
    playAudio(t.src);
  }

  function setNowPlaying(track) {
    nowTitle.textContent = track.title;
    nowArtist.textContent = track.artist;
    nowCover.src = track.cover;
    player.src = track.src;
  }

  function playAudio(src) {
    if (player.src !== src) player.src = src;
    player.play().catch(err => console.warn('play failed', err));
  }

  // Footer play/pause toggle
  playControl.addEventListener('click', () => {
    if (player.paused) player.play();
    else player.pause();
    updatePlayIcon();
  });

  prevBtn.addEventListener('click', () => {
    if (tracks.length === 0) return;
    currentIndex = (currentIndex <= 0) ? tracks.length - 1 : currentIndex - 1;
    playTrackAtIndex(currentIndex);
  });

  nextBtn.addEventListener('click', () => {
    if (tracks.length === 0) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    playTrackAtIndex(currentIndex);
  });

  player.addEventListener('play', updatePlayIcon);
  player.addEventListener('pause', updatePlayIcon);
  player.addEventListener('ended', () => {
    // Автопереход к следующему треку при окончании
    if (tracks.length === 0) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    playTrackAtIndex(currentIndex);
  });

  function updatePlayIcon() {
    playControl.innerHTML = '';
    const iconName = player.paused ? 'play' : 'pause';
    // safe check for lucide
    if (lucide && lucide.icons && lucide.icons[iconName]) {
      const svg = lucide.icons[iconName].toSvg({ width: 18, height: 18 });
      playControl.insertAdjacentHTML('beforeend', svg);
    } else {
      playControl.textContent = player.paused ? 'Play' : 'Pause';
    }
  }

  // Debounced search on input
  const debouncedSearch = debounce((e) => search(e.target.value.trim()), 400);
  searchInput.addEventListener('input', debouncedSearch);

  // Initial icons
  lucide.createIcons();

  // Optional: allow pressing Enter to search immediately
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      search(e.target.value.trim());
    }
  });
});
