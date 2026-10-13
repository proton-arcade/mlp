/*
 * Music: a song library kept on this device (IndexedDB). Songs are added from
 * audio files on your computer, with the Add button or by dropping them on the
 * list. Remove one song with its ×, or select several and press Remove or Delete.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const db = window.LocalDB('mixt-music', ['tracks']);

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

    const AUDIO_EXT = /\.mp3$/i; // MP3 only
    const REPEAT_LABELS = ['off', 'all', 'one'];

    let tracks = [];          // { id, name, title, size, added, duration, blob }
    let selected = new Set(); // ids
    let anchorId = null;      // last clicked row, for shift-click ranges
    let playingId = null;
    let objectUrl = null;
    let shuffle = false;
    let repeat = 0;           // 0 off, 1 all, 2 one

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function fmt (sec) {
        if ( !Number.isFinite(sec) || sec < 0 ) sec = 0;
        const s = Math.floor(sec);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    }

    function visible () {
        const q = searchEl.value.trim().toLowerCase();
        return q ? tracks.filter((t) => t.title.toLowerCase().includes(q)) : tracks;
    }

    function byId (id) {
        return tracks.find((t) => t.id === id) || null;
    }

    function render () {
        const shown = visible();
        const n = tracks.length;
        countEl.textContent = `Music folder · ${n} song${n === 1 ? '' : 's'}`;
        emptyEl.classList.toggle('hidden', n > 0);
        tableEl.classList.toggle('hidden', n === 0);
        if ( n > 0 && shown.length === 0 ) {
            rowsEl.innerHTML = '<tr><td colspan="4" class="empty">No songs match your search.</td></tr>';
        } else {
            rowsEl.innerHTML = shown.map((t) => {
                const idx = tracks.indexOf(t) + 1;
                const classes = ['row'];
                if ( selected.has(t.id) ) classes.push('selected');
                if ( t.id === playingId ) classes.push('playing');
                return `
                <tr class="${classes.join(' ')}" data-id="${esc(t.id)}">
                    <td class="n">${t.id === playingId ? '&#9835;' : idx}</td>
                    <td class="t" title="${esc(t.name)}">${esc(t.title)}</td>
                    <td class="d">${t.duration ? fmt(t.duration) : ''}</td>
                    <td class="x"><button class="remove" type="button" data-remove="${esc(t.id)}" title="Remove from library" aria-label="Remove ${esc(t.title)}">&times;</button></td>
                </tr>`;
            }).join('');
        }
        removeBtn.disabled = selected.size === 0;
        playBtn.disabled = tracks.length === 0;
        nextBtn.disabled = prevBtn.disabled = tracks.length === 0;
        updateNowPlaying();
    }

    function updateNowPlaying () {
        const t = byId(playingId);
        if ( !t ) {
            nowTitleEl.textContent = 'Nothing playing';
            nowSubEl.textContent = tracks.length ? 'Double-click a song to play it' : 'Add a song to start';
            seekEl.disabled = true;
            seekEl.max = 0;
            seekEl.value = 0;
            curEl.textContent = '0:00';
            durEl.textContent = '0:00';
        } else {
            nowTitleEl.textContent = t.title;
            nowSubEl.textContent = `${fmt(audio.currentTime)} of ${t.duration ? fmt(t.duration) : '…'}`;
        }
        playBtn.textContent = !audio.paused && t ? '\u275A\u275A' : '\u25B6';
        const label = !audio.paused && t ? 'Pause' : 'Play';
        playBtn.title = label;
        playBtn.setAttribute('aria-label', label);
        shuffleBtn.classList.toggle('on', shuffle);
        shuffleBtn.setAttribute('aria-pressed', String(shuffle));
        repeatBtn.classList.toggle('on', repeat !== 0);
        repeatBtn.textContent = repeat === 2 ? 'Repeat 1' : 'Repeat';
        repeatBtn.title = `Repeat: ${REPEAT_LABELS[repeat]}`;
        repeatBtn.setAttribute('aria-label', `Repeat ${REPEAT_LABELS[repeat]}`);
    }

    async function load () {
        const rows = await db.all('tracks');
        tracks = rows.sort((a, b) => a.added - b.added);
        selected = new Set([...selected].filter((id) => byId(id)));
        render();
    }

    // -- Adding and removing ------------------------------------------------

    function isAudio (file) {
        return file.type === 'audio/mpeg' || AUDIO_EXT.test(file.name);
    }

    async function addFiles (fileList) {
        const files = [...fileList];
        const accepted = files.filter(isAudio);
        const skipped = files.length - accepted.length;
        let base = Date.now();
        for ( const file of accepted ) {
            const record = {
                id: crypto.randomUUID(),
                name: file.name,
                title: file.name.replace(/\.[^.]+$/, '') || file.name,
                size: file.size,
                added: base++,
                duration: 0,
                blob: file,
            };
            await db.put('tracks', record);
        }
        await load();
        if ( skipped ) {
            nowSubEl.textContent = `${skipped} file${skipped === 1 ? ' was' : 's were'} not audio and ${skipped === 1 ? 'was' : 'were'} skipped.`;
        }
    }

    async function removeIds (ids) {
        if ( !ids.length ) return;
        const gone = new Set(ids);
        for ( const id of ids ) {
            await db.remove('tracks', id);
        }
        if ( playingId && gone.has(playingId) ) stop();
        selected = new Set([...selected].filter((id) => !gone.has(id)));
        await load();
    }

    function stop () {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if ( objectUrl ) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        playingId = null;
    }

    // -- Playback ----------------------------------------------------------

    async function play (id) {
        const t = byId(id);
        if ( !t ) return;
        if ( objectUrl ) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(t.blob);
        playingId = id;
        audio.src = objectUrl;
        seekEl.disabled = false;
        try {
            await audio.play();
        } catch (err) {
            nowSubEl.textContent = `Could not play "${t.title}".`;
        }
        render();
    }

    function togglePlay () {
        if ( !playingId ) {
            const first = visible()[0] || tracks[0];
            if ( first ) play(first.id);
            return;
        }
        if ( audio.paused ) audio.play().catch(() => {});
        else audio.pause();
    }

    function pickNext (step) {
        if ( !tracks.length ) return null;
        if ( shuffle && tracks.length > 1 ) {
            let pick;
            do {
                pick = tracks[Math.floor(Math.random() * tracks.length)];
            } while ( pick.id === playingId );
            return pick.id;
        }
        const i = tracks.findIndex((t) => t.id === playingId);
        let j = i + step;
        if ( j < 0 || j >= tracks.length ) {
            if ( repeat !== 1 ) return null;
            j = (j + tracks.length) % tracks.length;
        }
        return tracks[j].id;
    }

    function next () {
        const id = pickNext(1);
        if ( id ) {
            play(id);
        } else {
            stop();
            render();
        }
    }

    function previous () {
        if ( audio.currentTime > 3 ) {
            audio.currentTime = 0;
            return;
        }
        const id = pickNext(-1);
        if ( id ) play(id);
        else {
            audio.currentTime = 0;
        }
    }

    audio.addEventListener('timeupdate', () => {
        curEl.textContent = fmt(audio.currentTime);
        if ( !seekEl.matches(':active') ) seekEl.value = audio.currentTime;
        updateNowPlaying();
    });

    audio.addEventListener('loadedmetadata', async () => {
        const t = byId(playingId);
        if ( !t ) return;
        seekEl.max = audio.duration || 0;
        durEl.textContent = fmt(audio.duration);
        if ( Number.isFinite(audio.duration) && t.duration !== audio.duration ) {
            t.duration = audio.duration;
            const { blob, ...meta } = t;
            await db.put('tracks', { ...meta, blob });
            render();
        }
    });

    audio.addEventListener('play', () => { render(); });
    audio.addEventListener('pause', () => { render(); });
    audio.addEventListener('ended', () => {
        if ( repeat === 2 ) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            return;
        }
        const id = pickNext(1);
        if ( id ) play(id);
        else { playingId = null; render(); }
    });
    audio.addEventListener('error', () => {
        const t = byId(playingId);
        nowSubEl.textContent = t ? `Could not play "${t.title}".` : 'Could not play this song.';
    });

    // -- Selection and events ---------------------------------------------

    function rowClick (e, id) {
        if ( e.shiftKey && anchorId ) {
            const list = visible();
            const a = list.findIndex((t) => t.id === anchorId);
            const b = list.findIndex((t) => t.id === id);
            const [lo, hi] = a < b ? [a, b] : [b, a];
            selected = new Set(list.slice(lo, hi + 1).map((t) => t.id));
        } else if ( e.ctrlKey || e.metaKey ) {
            if ( selected.has(id) ) selected.delete(id);
            else selected.add(id);
            anchorId = id;
        } else {
            selected = new Set([id]);
            anchorId = id;
        }
        render();
    }

    rowsEl.addEventListener('click', (e) => {
        const del = e.target.closest('[data-remove]');
        if ( del ) {
            e.stopPropagation();
            removeIds([del.dataset.remove]);
            return;
        }
        const row = e.target.closest('tr.row');
        if ( !row ) return;
        // Handle the double-click here rather than with a 'dblclick' listener:
        // the first click re-renders the row, so the second click no longer
        // lands on the element a 'dblclick' event would be dispatched to.
        if ( e.detail === 2 ) {
            play(row.dataset.id);
            return;
        }
        rowClick(e, row.dataset.id);
    });

    $('add').addEventListener('click', () => $('file').click());
    $('file').addEventListener('change', async (e) => {
        await addFiles(e.target.files);
        e.target.value = '';
    });

    removeBtn.addEventListener('click', () => removeIds([...selected]));
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', previous);
    shuffleBtn.addEventListener('click', () => { shuffle = !shuffle; render(); });
    repeatBtn.addEventListener('click', () => { repeat = (repeat + 1) % 3; render(); });

    seekEl.addEventListener('input', () => { audio.currentTime = Number(seekEl.value); });
    volumeEl.addEventListener('input', () => { audio.volume = Number(volumeEl.value); });
    audio.volume = Number(volumeEl.value);

    searchEl.addEventListener('input', render);

    dropEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropEl.classList.add('over');
    });
    dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
    dropEl.addEventListener('drop', (e) => {
        e.preventDefault();
        dropEl.classList.remove('over');
        if ( e.dataTransfer?.files?.length ) addFiles(e.dataTransfer.files);
    });

    dropEl.addEventListener('keydown', (e) => {
        if ( e.key === 'Delete' || e.key === 'Backspace' ) {
            if ( selected.size ) {
                e.preventDefault();
                removeIds([...selected]);
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if ( e.target.closest('input, textarea') ) return;
        if ( e.code === 'Space' ) {
            e.preventDefault();
            togglePlay();
        }
    });

    load();
})();
