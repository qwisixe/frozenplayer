// renderer.js
// Логика поиска и управления плеером (renderer process)
// Использует Jamendo API (если задан JAMENDO_CLIENT_ID через preload) или fallback на iTunes Search API.

document.addEventListener('DOMContentLoaded', () => {
  // Read JAMENDO_CLIENT_ID from the secure preload-exposed object
  const JAMENDO_CLIENT_ID = (window.env && window.env.JAMENDO_CLIENT_ID) ? window.env.JAMENDO_CLIENT_ID : '';

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
      tracks = [];
      currentIndex = -1;
      return;
    }

    resultsContainer.innerHTML = '<div class="col-span-3 text-[var(--muted)]">Поиск...</div>';

    try {
      if (JAMENDO_CLIENT_ID) {
        await searchJamendo(term);
      } else {
        await searchiTunes(term);
      }
    } catch (err) {
      console.error('Search error', err);
      resultsContainer.innerHTML = '<div class="col-span-3 text-red-400">Ошибка поиска. Попробуйте ещё раз.</div>';
    }
  }

  async function searchJamendo(term) {
    // Jamendo API: https://developer.jamendo.com/v3.0
    const q = encodeURIComponent(term);
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=30&namesearch=${q}&include=musicinfo`;

    const res = await fetch(url);
    const data = await res.json();
    const items = data.results || [];

    tracks = items
      .filter(i => i.audio) // require playable url
      .map(i => ({
        title: i.name || 'Unknown',
        artist: i.artist_name || 'Unknown',
        cover: i.album_image || 'https://via.placeholder.com/400',
        src: i.audio // mp3 stream
      }));

    renderResults();
  }

  async function searchiTunes(term) {
    const q = encodeURIComponent(term);
    const url = `https://itunes.apple.com/search?term=${q}&media=music&limit=25`;

    const res = await fetch(url);
    const data = await res.json();
    const items = data.results || [];

    tracks = items
      .filter(i => i.previewUrl)
      .map(i => ({
        title: i.trackName || i.collectionName || 'Unknown',
        artist: i.artistName || 'Unknown',
        cover: i.artworkUrl100 ? i.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://via.placeholder.com/400',
        src: i.previewUrl
      }));

    renderResults();
  }

  function renderResults() {
    resultsContainer.innerHTML = '';
    if (!tracks.length) {
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

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTrackAtIndex(idx);
      });

      const card = clone.querySelector('.card');
      card.addEventListener('click', () => {
        playTrackAtIndex(idx);
      });

      resultsContainer.appendChild(clone);
    });

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
    // set audio src but don't auto-play here; playAudio will call play()
    player.src = track.src;
  }

  function playAudio(src) {
    if (player.src !== src) player.src = src;
    player.play().catch(err => console.warn('play failed', err));
  }

  // Controls
  playControl.addEventListener('click', () => {
    if (player.paused) player.play();
    else player.pause();
    updatePlayIcon();
  });

  prevBtn.addEventListener('click', () => {
    if (!tracks.length) return;
    currentIndex = (currentIndex <= 0) ? tracks.length - 1 : currentIndex - 1;
    playTrackAtIndex(currentIndex);
  });

  nextBtn.addEventListener('click', () => {
    if (!tracks.length) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    playTrackAtIndex(currentIndex);
  });

  player.addEventListener('play', updatePlayIcon);
  player.addEventListener('pause', updatePlayIcon);
  player.addEventListener('ended', () => {
    if (!tracks.length) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    playTrackAtIndex(currentIndex);
  });

  function updatePlayIcon() {
    playControl.innerHTML = '';
    const iconName = player.paused ? 'play' : 'pause';
    if (lucide && lucide.icons && lucide.icons[iconName]) {
      const svg = lucide.icons[iconName].toSvg({ width: 18, height: 18 });
      playControl.insertAdjacentHTML('beforeend', svg);
    } else {
      playControl.textContent = player.paused ? 'Play' : 'Pause';
    }
  }

  const debouncedSearch = debounce((e) => search(e.target.value.trim()), 400);
  searchInput.addEventListener('input', debouncedSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search(e.target.value.trim());
  });

  // init icons
  lucide.createIcons();
  updatePlayIcon();
});
