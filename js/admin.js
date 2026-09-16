window.MGMusicAdmin = (function () {
  let currentEditSong = null;

  async function init() {
    await loadDashboard();
    bindUploadForm();
    bindEditForm();
    bindRealtime();
  }

  async function bindRealtime() {
    supabase
      .channel('admin_song_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, async () => {
        await loadDashboard();
      })
      .subscribe();
  }

  async function loadDashboard() {
    try {
      const { data: songs, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalSongs = songs.length;
      const totalPlays = songs.reduce((sum, item) => sum + (Number(item.plays) || 0), 0);
      const totalDownloads = songs.reduce((sum, item) => sum + (Number(item.downloads) || 0), 0);
      const latestUploads = songs.length ? songs.slice(0, 5).length : 0;

      document.getElementById('totalSongs').textContent = String(totalSongs);
      document.getElementById('totalPlays').textContent = String(totalPlays);
      document.getElementById('totalDownloads').textContent = String(totalDownloads);
      document.getElementById('latestUploads').textContent = String(latestUploads);

      renderSongList(songs || []);
    } catch (error) {
      console.error('Dashboard load failed:', error);
      showMessage('uploadMessage', 'Dashboard failed to load. Please refresh.', 'error');
    }
  }

  function renderSongList(songs) {
    const list = document.getElementById('adminSongList');
    if (!list) return;

    if (!songs.length) {
      list.innerHTML = '<p>No songs uploaded yet.</p>';
      return;
    }

    list.innerHTML = songs.map(song => `
      <div class="admin-song-item">
        <img src="${song.cover_url || ''}" alt="${song.title || 'Song cover'}" />
        <div>
          <strong>${song.title || 'Untitled'}</strong><br />
          <small>${song.artist || 'Unknown artist'}</small>
        </div>
        <div>
          <small>Date</small><br />
          ${new Date(song.created_at).toLocaleDateString()}
        </div>
        <div>
          <small>Plays</small><br />
          ${song.plays || 0}
        </div>
        <div>
          <small>Downloads</small><br />
          ${song.downloads || 0}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" data-action="edit" data-id="${song.id}">Edit</button>
          <button type="button" class="btn btn-danger" data-action="delete" data-id="${song.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const id = event.currentTarget.dataset.id;
        const action = event.currentTarget.dataset.action;
        const song = songs.find(item => item.id === id);
        if (!song) return;

        if (action === 'edit') {
          openEditModal(song);
        }

        if (action === 'delete') {
          await deleteSong(song);
        }
      });
    });
  }

  function bindUploadForm() {
    const form = document.getElementById('uploadForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const title = document.getElementById('songTitle').value.trim();
      const artist = document.getElementById('songArtist').value.trim();
      const album = document.getElementById('songAlbum').value.trim();
      const genre = document.getElementById('songGenre').value.trim();
      const description = document.getElementById('songDescription').value.trim();
      const audioFile = document.getElementById('audioFile').files[0];
      const coverFile = document.getElementById('coverFile').files[0];

      if (!title || !artist || !audioFile) {
        showMessage('uploadMessage', 'Title, artist, and MP3 file are required.', 'error');
        return;
      }

      if (!audioFile.type.includes('audio')) {
        showMessage('uploadMessage', 'Invalid MP3 file. Please choose an audio file.', 'error');
        return;
      }

      if (coverFile && !coverFile.type.startsWith('image/')) {
        showMessage('uploadMessage', 'Invalid cover image file.', 'error');
        return;
      }

      showProgress(true);
      try {
        const audioPath = `songs/${Date.now()}-${slugify(audioFile.name)}`;
        const coverPath = coverFile ? `covers/${Date.now()}-${slugify(coverFile.name)}` : '';

        const audioUpload = await supabase.storage.from('music').upload(audioPath, audioFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            updateProgress(percent);
          }
        });

        if (audioUpload.error) throw audioUpload.error;

        let coverUpload = null;
        if (coverFile) {
          coverUpload = await supabase.storage.from('covers').upload(coverPath, coverFile, {
            cacheControl: '3600',
            upsert: false
          });

          if (coverUpload.error) throw coverUpload.error;
        }

        const { data: audioData } = supabase.storage.from('music').getPublicUrl(audioPath);
        const { data: coverData } = coverFile
          ? supabase.storage.from('covers').getPublicUrl(coverPath)
          : { data: { publicUrl: '' } };

        const payload = {
          title,
          artist,
          album,
          genre,
          description,
          audio_url: audioData.publicUrl,
          audio_path: audioPath,
          cover_url: coverData.publicUrl,
          cover_path: coverPath,
          published: true,
          plays: 0,
          downloads: 0
        };

        const { data, error } = await supabase
          .from('songs')
          .insert(payload)
          .select();

        if (error) throw error;

        form.reset();
        showProgress(false);
        showMessage('uploadMessage', `Upload successful. "${data[0]?.title || title}" is now live.`, 'success');
        await loadDashboard();
      } catch (error) {
        console.error('Upload failed:', error);
        showProgress(false);
        showMessage('uploadMessage', 'Upload failed. Please check your internet connection and file validity.', 'error');
      }
    });
  }

  function bindEditForm() {
    const form = document.getElementById('editForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!currentEditSong) return;

      const title = document.getElementById('editTitle').value.trim();
      const artist = document.getElementById('editArtist').value.trim();
      const album = document.getElementById('editAlbum').value.trim();
      const genre = document.getElementById('editGenre').value.trim();
      const description = document.getElementById('editDescription').value.trim();
      const coverFile = document.getElementById('editCoverFile').files[0];

      try {
        let coverUrl = currentEditSong.cover_url || '';
        let coverPath = currentEditSong.cover_path || '';

        if (coverFile) {
          if (!coverFile.type.startsWith('image/')) {
            throw new Error('Invalid cover image');
          }

          const newCoverPath = `covers/${Date.now()}-${slugify(coverFile.name)}`;
          const uploadResult = await supabase.storage.from('covers').upload(newCoverPath, coverFile, {
            cacheControl: '3600',
            upsert: false
          });

          if (uploadResult.error) throw uploadResult.error;

          if (currentEditSong.cover_path) {
            await supabase.storage.from('covers').remove([currentEditSong.cover_path]);
          }

          const { data: coverData } = supabase.storage.from('covers').getPublicUrl(newCoverPath);
          coverUrl = coverData.publicUrl;
          coverPath = newCoverPath;
        }

        const { error } = await supabase
          .from('songs')
          .update({
            title,
            artist,
            album,
            genre,
            description,
            cover_url: coverUrl,
            cover_path: coverPath
          })
          .eq('id', currentEditSong.id);

        if (error) throw error;

        document.getElementById('editSongModal').classList.add('hidden');
        currentEditSong = null;
        await loadDashboard();
      } catch (error) {
        console.error('Edit failed:', error);
        showMessage('uploadMessage', 'Song update failed. Check your file and internet connection.', 'error');
      }
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      document.getElementById('editSongModal').classList.add('hidden');
      currentEditSong = null;
    });
  }

  function openEditModal(song) {
    currentEditSong = song;

    document.getElementById('editTitle').value = song.title || '';
    document.getElementById('editArtist').value = song.artist || '';
    document.getElementById('editAlbum').value = song.album || '';
    document.getElementById('editGenre').value = song.genre || '';
    document.getElementById('editDescription').value = song.description || '';
    document.getElementById('editCoverFile').value = '';

    document.getElementById('editSongModal').classList.remove('hidden');
  }

  async function deleteSong(song) {
    const confirmed = window.confirm(`Delete "${song.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      if (song.audio_path) {
        await supabase.storage.from('music').remove([song.audio_path]);
      }

      if (song.cover_path) {
        await supabase.storage.from('covers').remove([song.cover_path]);
      }

      const { error } = await supabase.from('songs').delete().eq('id', song.id);
      if (error) throw error;

      showMessage('uploadMessage', 'Song deleted successfully.', 'success');
      await loadDashboard();
    } catch (error) {
      console.error('Delete failed:', error);
      showMessage('uploadMessage', 'Delete failed. Check the file storage and database.', 'error');
    }
  }

  function showMessage(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('success', 'error');
    if (type) el.classList.add(type);
  }

  function showProgress(visible) {
    const progress = document.getElementById('uploadProgress');
    if (!progress) return;
    progress.style.display = visible ? 'block' : 'none';
  }

  function updateProgress(percent) {
    const fill = document.getElementById('uploadProgressBar');
    if (!fill) return;
    fill.style.width = `${percent}%`;
  }

  function slugify(value) {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  return { init };
})();
