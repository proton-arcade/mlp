/*
 * Music: a Spotify-style player for the Music folder in your Mixt files
 * (~/Music). Songs are streamed from the server, so they are kept with your
 * files rather than in this browser. Only MP3 files are listed or added.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const MUSIC_DIR = '~/Music';
    const MP3 = /\.mp3$/i;
    const REPEAT_LABELS = ['off', 'all', 'one'];

    const audio = $('audio');
    const dropEl = $('drop');
    const tableEl = $('table');
    const rowsEl = $('rows');
    const emptyEl = $('empty');
    const countEl = $('count');
    const searchEl = $('search');
    const removeBtn = $('remove');
    const playBtn = $('play');
    const prevBtn = $('prev');
    const nextBtn = $('next');
    const shuffleBtn = $('shuffle');
    const repeatBtn = $('repeat');
    const seekEl = $('seek');
    const volumeEl = $('volume');
    const curEl = $('cur');
    const durEl = $('dur');
    const nowTitleEl = $('nowTitle');
    const nowSubEl = $('nowSub');

    let tracks = [];          // { path, uid, title, size }
    let selected = new Set(); // paths
    let anchorPath = null;    // last clicked row, for shift-click ranges
    let playingPath = null;
    let shuffle = false;
    let repeat = 0;           // 0 off, 1 all, 2 one
    const urlCache = new Map(); // path -> streaming URL for this session

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function fmt (sec) {
        if (!Number.isFinite(sec) || sec < 0) sec = 0;
        const s = Math.floor(sec);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    }

    function setMessage (text, isError) {
        nowSubEl.textContent = text || '';
        nowSubEl.style.color = isError ? '#b42318' : '';
    }

    function sdk () {
        if (!window.mixt || !mixt.fs) {
            throw new Error('Sign in to Mixt to use your Music folder.');
        }
        return mixt.fs;
    }

    function titleOf (name) {
        return name.replace(/\.mp3$/i, '');
    }

    function visible () {
        const q = searchEl.value.trim().toLowerCase();
        return q ? tracks.filter((t) => t.title.toLowerCase().includes(q)) : tracks;
    }

    async function ensureFolder () {
        try {
            await sdk().mkdir(MUSIC_DIR);
        } catch (_) {
            // Already exists, or the folder is not writable; listing will report it.
        }
    }

    async function refresh () {
        try {
            const entries = await sdk().readdir(MUSIC_DIR);
            tracks = (entries || [])
                .filter((e) => !(e.is_dir ?? e.fsentry_is_dir) && MP3.test(e.name))
                .map((e) => ({
                    path: e.path,
                    uid: e.uid,
                    title: titleOf(e.name),
                    size: e.size ?? e.fsentry_size ?? 0,
                }))
                .sort((a, b) => a.title.localeCompare(b.title));
            selected = new Set([...selected].filter((p) => tracks.some((t) => t.path === p)));
            setMessage(tracks.length ? '' : 'Add MP3 files to start your library.');
        } catch (err) {
            tracks = [];
            setMessage(err.message || 'Could not read your Music folder.', true);
        }
        render();
    }

    function render () {
        const list = visible();
        countEl.textContent = `Music folder · ${tracks.length} song${tracks.length === 1 ? '' : 's'}`;
        emptyEl.hidden = tracks.length > 0;
        tableEl.classList.toggle('hidden', tracks.length === 0);
        rowsEl.innerHTML = '';
        for (const t of list) {
            const tr = document.createElement('tr');
            tr.dataset.path = t.path;
            tr.classList.toggle('selected', selected.has(t.path));
            tr.classList.toggle('playing', t.path === playingPath);
            tr.innerHTML = `<td>${esc(t.title)}</td><td class="num">${esc((t.size / 1048576).toFixed(1))} MB</td>`;
            tr.addEventListener('click', (e) => onRowClick(e, t));
            tr.addEventListener('dblclick', () => playTrack(t));
            rowsEl.appendChild(tr);
        }
        removeBtn.disabled = selected.size === 0;
        playBtn.disabled = tracks.length === 0;
        prevBtn.disabled = nextBtn.disabled = tracks.length === 0;
        shuffleBtn.setAttribute('aria-pressed', String(shuffle));
        shuffleBtn.classList.toggle('on', shuffle);
        repeatBtn.textContent = 'Repeat: ' + REPEAT_LABELS[repeat];
        repeatBtn.setAttribute('aria-label', 'Repeat ' + REPEAT_LABELS[repeat]);
        repeatBtn.classList.toggle('on', repeat > 0);
    }

    function onRowClick (e, t) {
        const list = visible();
        if (e.shiftKey && anchorPath) {
            const from = list.findIndex((x) => x.path === anchorPath);
            const to = list.findIndex((x) => x.path === t.path);
            const [a, b] = from < to ? [from, to] : [to, from];
            selected = new Set(list.slice(a, b + 1).map((x) => x.path));
        } else if (e.metaKey || e.ctrlKey) {
            if (selected.has(t.path)) selected.delete(t.path);
            else selected.add(t.path);
            anchorPath = t.path;
        } else {
            selected = new Set([t.path]);
            anchorPath = t.path;
        }
        render();
    }

    async function trackUrl (track) {
        if (urlCache.has(track.path)) return urlCache.get(track.path);
        const result = await sdk().getReadURL(track.path);
        urlCache.set(track.path, result);
        return result;
    }

    async function playTrack (track) {
        if (!track) return;
        try {
            const url = await trackUrl(track);
            playingPath = track.path;
            nowTitleEl.textContent = track.title;
            nowSubEl.textContent = '';
            audio.src = url;
            await audio.play();
            playBtn.innerHTML = '&#10074;&#10074;';
            playBtn.setAttribute('aria-label', 'Pause');
            render();
        } catch (err) {
            setMessage(err.message || 'Could not play that song.', true);
        }
    }

    function currentIndex () {
        return tracks.findIndex((t) => t.path === playingPath);
    }

    function nextTrack (dir) {
        if (!tracks.length) return null;
        if (shuffle && tracks.length > 1) {
            let i;
            do { i = Math.floor(Math.random() * tracks.length); } while (i === currentIndex());
            return tracks[i];
        }
        const i = currentIndex();
        const j = i + dir;
        if (j >= 0 && j < tracks.length) return tracks[j];
        if (repeat === 1) return tracks[(j + tracks.length) % tracks.length];
        return null;
    }

    function togglePlay () {
        if (!playingPath) {
            playTrack(tracks[0]);
        } else if (audio.paused) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }

    audio.addEventListener('play', () => {
        playBtn.innerHTML = '&#10074;&#10074;';
        playBtn.setAttribute('aria-label', 'Pause');
    });
    audio.addEventListener('pause', () => {
        playBtn.innerHTML = '&#9654;';
        playBtn.setAttribute('aria-label', 'Play');
    });
    audio.addEventListener('loadedmetadata', () => {
        seekEl.max = String(audio.duration || 0);
        seekEl.disabled = false;
        durEl.textContent = fmt(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
        seekEl.value = String(audio.currentTime);
        curEl.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
        if (repeat === 2) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
        const next = nextTrack(1);
        if (next) playTrack(next);
        else setMessage('End of the Music folder.');
    });
    audio.addEventListener('error', () => {
        setMessage('Could not stream that song. Check your connection and try again.', true);
    });

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => {
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        const prev = nextTrack(-1);
        if (prev) playTrack(prev);
    });
    nextBtn.addEventListener('click', () => {
        const next = nextTrack(1);
        if (next) playTrack(next);
    });
    shuffleBtn.addEventListener('click', () => { shuffle = !shuffle; render(); });
    repeatBtn.addEventListener('click', () => { repeat = (repeat + 1) % 3; render(); });
    seekEl.addEventListener('input', () => { audio.currentTime = Number(seekEl.value); });
    volumeEl.addEventListener('input', () => { audio.volume = Number(volumeEl.value); });
    audio.volume = Number(volumeEl.value);
    searchEl.addEventListener('input', render);

    removeBtn.addEventListener('click', async () => {
        const paths = [...selected];
        if (!paths.length || !window.confirm(`Remove ${paths.length} song${paths.length === 1 ? '' : 's'} from your Music folder?`)) return;
        try {
            await sdk().delete(paths);
            paths.forEach((p) => urlCache.delete(p));
            if (paths.includes(playingPath)) { audio.pause(); audio.removeAttribute('src'); playingPath = null; nowTitleEl.textContent = 'Nothing playing'; }
            selected.clear();
            await refresh();
        } catch (err) {
            setMessage(err.message || 'Could not remove those songs.', true);
        }
    });

    async function addFiles (files) {
        const list = Array.from(files || []);
        const mp3s = list.filter((f) => MP3.test(f.name) || f.type === 'audio/mpeg');
        const skipped = list.length - mp3s.length;
        let added = 0;
        for (const file of mp3s) {
            try {
                await sdk().write(`${MUSIC_DIR}/${file.name}`, file, { overwrite: false, dedupeName: true });
                added++;
            } catch (err) {
                setMessage(err.message || `Could not add ${file.name}.`, true);
            }
        }
        await refresh();
        if (skipped) setMessage(`Skipped ${skipped} file${skipped === 1 ? '' : 's'}: only MP3 is supported.`, true);
        else if (added) setMessage(`Added ${added} song${added === 1 ? '' : 's'}.`);
    }

    $('add').addEventListener('click', () => $('file').click());
    $('file').addEventListener('change', (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    });
    dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
    dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
    dropEl.addEventListener('drop', (e) => {
        e.preventDefault();
        dropEl.classList.remove('over');
        addFiles(e.dataTransfer.files);
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        if (e.key === 'Delete' || e.key === 'Backspace') removeBtn.click();
    });

    async function boot () {
        setMessage('Loading your Music folder…');
        await ensureFolder();
        await refresh();
    }

    boot();
})();
