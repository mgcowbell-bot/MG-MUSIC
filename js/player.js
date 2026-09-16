window.showToast = function (message, type = 'info') {
  const existing = document.getElementById('global-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'global-toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '18px';
  toast.style.bottom = '110px';
  toast.style.zIndex = '200';
  toast.style.maxWidth = '360px';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '12px';
  toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#111827';
  toast.style.color = '#fff';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
  toast.style.border = '1px solid rgba(255,255,255,0.08)';
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
};

window.MGMusicPlayer = (function () {
  const state = {
    queue: [],
    index: 0,
    currentSong: null,
    repeat: false,
    shuffle: false,
    audio: null
  };

  function init() {
    state.audio = new Audio();
    state.audio.preload = 'auto';

    bindControls();

    state.audio.addEventListener('timeupdate', updateProgressUI);
    state.audio.addEventListener('loadedmetadata', updateDurationUI);
    state.audio.addEventListener('ended', () => {
      if (state.repeat) {
        state.audio.currentTime = 0;
        state.audio.play();
        return;
      }
      next();
    });

    state.audio.addEventListener('play', () => {
      const playBtn = document.getElementById('playPauseBtn');
      if (playBtn) playBtn.textContent = '❚❚';
    });

    state.audio.addEventListener('pause', () => {
      const playBtn = document.getElementById('playPauseBtn');
      if (playBtn) playBtn.textContent = '▶';
    });

    state.audio.addEventListener('error', () => {
      window.showToast('Playback failed. Please try again later.', 'error');
    });
  }

  function bindControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (!state.currentSong) {
          if (state.queue.length > 0) {
            playSong(state.queue[0]);
          }
          return;
        }

        if (state.audio.paused) {
          state.audio.play().catch(() => {
            window.showToast('Playback could not start. Please check the song URL.', 'error');
          });
        } else {
          state.audio.pause();
        }
      });
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', next);
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', previous);
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        state.shuffle = !state.shuffle;
        shuffleBtn.classList.toggle('active', state.shuffle);
      });
    }

    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        state.repeat = !state.repeat;
        repeatBtn.classList.toggle('active', state.repeat);
      });
    }

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        state.audio.muted = !state.audio.muted;
        muteBtn.textContent = state.audio.muted ? '🔇' : '🔊';
      });
    }

    const progress = document.getElementById('progress');
    if (progress) {
      progress.addEventListener('input', (event) => {
        const percent = Number(event.target.value) / 100;
        if (Number.isFinite(state.audio.duration)) {
          state.audio.currentTime = percent * state.audio.duration;
        }
      });
    }

    const volume = document.getElementById('volume');
    if (volume) {
      volume.addEventListener('input', (event) => {
        const value = Number(event.target.value);
        state.audio.volume = value;
        state.audio.muted = value === 0;
        const muteBtnEl = document.getElementById('muteBtn');
        if (muteBtnEl) muteBtnEl.textContent = state.audio.muted ? '🔇' : '🔊';
      });
    }
  }

  function setQueue(songs) {
    state.queue = Array.isArray(songs) ? songs : [];
    if (state.queue.length > 0 && !state.currentSong) {
      state.index = 0;
      playSong(state.queue[0]);
    }
  }

  function playSong(song) {
    if (!song || !song.audio_url) return;

    state.currentSong = song;
    state.audio.src = song.audio_url;
    state.audio.load();

    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playerCover = document.getElementById('playerCover');

    if (playerTitle) playerTitle.textContent = song.title || 'Untitled';
    if (playerArtist) playerArtist.textContent = song.artist || 'Unknown artist';
    if (playerCover) {
      playerCover.src = song.cover_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80';
      playerCover.alt = song.title || 'Album art';
    }

    state.audio.play().catch(() => {
      window.showToast('Playback failed. Check network and storage permissions.', 'error');
    });

    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.textContent = '❚❚';
  }

  function next() {
    if (!state.queue.length) return;

    let nextIndex = state.index + 1;
    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else if (nextIndex >= state.queue.length) {
      nextIndex = 0;
    }

    state.index = nextIndex;
    playSong(state.queue[nextIndex]);
  }

  function previous() {
    if (!state.queue.length) return;

    let prevIndex = state.index - 1;
    if (prevIndex < 0) prevIndex = state.queue.length - 1;
    state.index = prevIndex;
    playSong(state.queue[prevIndex]);
  }

  function updateProgressUI() {
    const progress = document.getElementById('progress');
    const currentTimeEl = document.getElementById('currentTime');
    if (!progress || !currentTimeEl) return;

    const total = Number.isFinite(state.audio.duration) ? state.audio.duration : 0;
    if (!total) return;

    const current = Number.isFinite(state.audio.currentTime) ? state.audio.currentTime : 0;
    const pct = (current / total) * 100;
    progress.value = String(pct);
    currentTimeEl.textContent = formatTime(current);
  }

  function updateDurationUI() {
    const durationEl = document.getElementById('duration');
    if (durationEl) {
      durationEl.textContent = formatTime(state.audio.duration || 0);
    }
  }

  function formatTime(seconds) {
    const total = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  return {
    init,
    setQueue,
    playSong,
    next,
    previous
  };
})();
