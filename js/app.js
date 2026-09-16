window.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page === 'home') {
    await App.init();
  }
});

const App = {
  songs: [],
  currentSearch: '',

  async init() {
    this.bindSearch();
    await this.loadSongs();
    this.loadSongFromUrl();
    this.subscribeToSongs();
  },

  bindSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', async (event) => {
      const q = (event.target.value || '').trim();
      this.currentSearch = q;
      await this.loadSongs(q);
    });
  },

  async loadSongs(term = '') {
    try {
      let query = supabase
        .from('songs')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (term) {
        const q = `%${term}%`;
        query = query.or(`title.ilike.${q},artist.ilike.${q},album.ilike.${q},genre.ilike.${q}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      this.songs = data || [];
      this.render();
    } catch (error) {
      console.error('Failed to load songs:', error);
      window.showToast('Failed to load music library. Please refresh.', 'error');
    }
  },

  render() {
    const featured = this.songs.slice(0, 3);
    const latest = this.songs.slice(0, 5);
    const popular = [...this.songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);

    const featuredGrid = document.getElementById('featuredGrid');
    const latestGrid = document.getElementById('latestGrid');
    const popularGrid = document.getElementById('popularGrid');
    const allGrid = document.getElementById('allMusicGrid');
    const genreList = document.getElementById('genreList');

    if (featuredGrid) featuredGrid.innerHTML = this.renderCards(featured);
    if (latestGrid) latestGrid.innerHTML = this.renderCards(latest);
    if (popularGrid) popularGrid.innerHTML = this.renderCards(popular);
    if (allGrid) allGrid.innerHTML = this.renderCards(this.songs);

    if (genreList) {
      const genres = [...new Set(this.songs.filter(song => song.genre).map(song => song.genre))];
      genreList.innerHTML = genres.length
        ? genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')
        : '<p>No genres available.</p>';
    }

    this.bindSongActions();

    if (this.songs.length > 0) {
      window.MGMusicPlayer.setQueue(this.songs);
    }
  },

  renderCards(songs) {
    if (!songs || !songs.length) {
      return '<p>No songs found.</p>';
    }

    return songs.map(song => `
      <article class="song-card" data-id="${song.id}">
        <img src="${song.cover_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80'}" alt="${song.title || 'Music cover'}" />
        <div class="song-info">
          <div class="song-title">${song.title || 'Untitled'}</div>
          <div class="song-artist">${song.artist || 'Unknown artist'}</div>

          <div class="meta-row">
            <span>🎵 ${song.plays || 0}</span>
            <span>⬇ ${song.downloads || 0}</span>
          </div>

          <div class="song-actions">
            <button type="button" data-action="play" data-id="${song.id}">Play</button>
            <button type="button" data-action="download" data-id="${song.id}">Download</button>
            <button type="button" data-action="share" data-id="${song.id}">Share</button>
          </div>
        </div>
      </article>
    `).join('');
  },

  bindSongActions() {
    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const songId = event.currentTarget.dataset.id;
        const song = this.songs.find(item => item.id === songId);
        if (!song) return;

        const action = event.currentTarget.dataset.action;
        if (action === 'play') {
          window.MGMusicPlayer.playSong(song);
        }

        if (action === 'download') {
          await this.downloadSong(song);
        }

        if (action === 'share') {
          await this.shareSong(song);
        }
      });
    });
  },

  async downloadSong(song) {
    try {
      if (!song.audio_url) {
        throw new Error('Song is missing a valid audio URL');
      }

      const response = await fetch(song.audio_url);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${(song.title || 'song').replace(/\s+/g, '_')}.mp3`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      const { error } = await supabase.rpc('increment_song_downloads', { song_id: song.id });
      if (error) {
        throw error;
      }

      window.showToast('Download started successfully.', 'success');
    } catch (error) {
      console.error(error);
      window.showToast('Download failed. Please check your internet connection.', 'error');
    }
  },

  async shareSong(song) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?song=${song.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: song.title,
          text: `Listen to ${song.title} by ${song.artist}`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        window.showToast('Share link copied to clipboard.', 'success');
      }
    } catch (error) {
      console.error(error);
      window.showToast('Share failed.', 'error');
    }
  },

  loadSongFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    if (!songId) return;

    const song = this.songs.find(item => item.id === songId);
    if (song) {
      window.MGMusicPlayer.playSong(song);
    }
  },

  subscribeToSongs() {
    supabase
      .channel('songs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, async () => {
        await this.loadSongs(this.currentSearch);
      })
      .subscribe();
  }
};
