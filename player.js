// Simple playlist + search for Frozen Player
// MODE: 'demo' or 'api'
const MODE = 'demo'; // переключите на 'api' чтобы подгружать с Jamendo (требует client_id)

// --- DEMO: захардкоденные треки (прямые MP3 URL + обложки)
const demoTracks = [
  { id: 't1', title: 'SoundHelix Song 1', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', cover: 'https://picsum.photos/seed/1/300/300' },
  { id: 't2', title: 'SoundHelix Song 2', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', cover: 'https://picsum.photos/seed/2/300/300' },
  { id: 't3', title: 'SoundHelix Song 3', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', cover: 'https://picsum.photos/seed/3/300/300' },
  { id: 't4', title: 'Peaceful Breeze', artist: 'Calm Demo', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', cover: 'https://picsum.photos/seed/4/300/300' },
  { id: 't5', title: 'Upbeat Demo', artist: 'Demo Beats', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', cover: 'https://picsum.photos/seed/5/300/300' },
  { id: 't6', title: 'Ambient Demo', artist: 'Space', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', cover: 'https://picsum.photos/seed/6/300/300' },
];

// --- JAMENDO EXAMPLE (api mode)
// Получите client_id на https://developer.jamendo.com/
async function fetchFromJamendo() {
  const CLIENT_ID = 'YOUR_JAMENDO_CLIENT_ID';
  const endpoint = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=10&audioformat=mp31&include=musicinfo+images`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Jamendo API error: ' + res.status);
    const json = await res.json();
    return json.results.map(r => ({
      id: r.id,
      title: r.name,
      artist: r.artist_name,
      src: r.audio,
      cover: (r.album && r.album.image) ? r.album.image : `https://picsum.photos/seed/${r.id}/300/300`
    }));
  } catch (err) {
    console.error('Jamendo fetch failed', err);
    return [];
  }
}

async function loadTracks() {
  if (MODE === 'demo') return demoTracks;
  const tracks = await fetchFromJamendo();
  return tracks.length ? tracks : demoTracks;
}

// UI логика
const audio = document.getElementById('audio');
const playlistEl = document.getElementById('playlist');
const searchEl = document.getElementById('search');
const nowTitle = document.getElementById('now-title');
const nowArtist = document.getElementById('now-artist');
const nowCover = document.getElementById('now-cover');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

let tracks = [], filtered = [], currentIndex = -1;

function renderPlaylist(list) {
  playlistEl.innerHTML = '';
  list.forEach((t, i) => {
    const li = document.createElement('li');
    li.dataset.index = i;
    li.innerHTML = `
      <img class="track-cover" src="${t.cover}" alt="cover" />
      <div class="track-meta">
        <div class="track-title">${escapeHtml(t.title)}</div>
        <div class="track-artist">${escapeHtml(t.artist)}</div>
      </div>
      <div class="track-duration">▶</div>
    `;
    li.addEventListener('click', () => playIndex(i));
    playlistEl.appendChild(li);
  });
  highlightPlaying();
}

function highlightPlaying() {
  Array.from(playlistEl.children).forEach(li => li.classList.remove('playing'));
  if (currentIndex >= 0 && playlistEl.children[currentIndex]) {
    playlistEl.children[currentIndex].classList.add('playing');
  }
}

function setNowPlaying(track) {
  nowTitle.textContent = track.title || '';
  nowArtist.textContent = track.artist || '';
  nowCover.src = track.cover || '';
}

function playIndex(i) {
  if (!filtered[i]) return;
  currentIndex = i;
  const t = filtered[currentIndex];
  audio.src = t.src;
  setNowPlaying(t);
  audio.play();
  playBtn.textContent = '⏸';
  highlightPlaying();
}

playBtn.addEventListener('click', () => {
  if (!audio.src && filtered.length) { playIndex(0); return; }
  if (audio.paused) { audio.play(); playBtn.textContent = '⏸'; }
  else { audio.pause(); playBtn.textContent = '▶️'; }
});

prevBtn.addEventListener('click', () => { if (currentIndex > 0) playIndex(currentIndex - 1); });
nextBtn.addEventListener('click', () => { if (currentIndex < filtered.length - 1) playIndex(currentIndex + 1); });

audio.addEventListener('ended', () => {
  if (currentIndex < filtered.length - 1) playIndex(currentIndex + 1);
  else playBtn.textContent = '▶️';
});

searchEl.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) filtered = [...tracks];
  else filtered = tracks.filter(t =>
    (t.title && t.title.toLowerCase().includes(q)) ||
    (t.artist && t.artist.toLowerCase().includes(q))
  );
  renderPlaylist(filtered);
});

(async function init(){
  tracks = await loadTracks();
  filtered = [...tracks];
  renderPlaylist(filtered);
  if (filtered.length) { audio.src = filtered[0].src; setNowPlaying(filtered[0]); }
})();

function escapeHtml(text){
  if (!text) return '';
  return text.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
}
