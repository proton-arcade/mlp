/*
 * Video Player: plays MP4 video and MP3 audio from files on this computer.
 * Built on the browser's own media elements. Only .mp4 and .mp3 are accepted.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const video = $('video');
    const art = $('art');
    const artName = $('artName');
    const placeholder = $('placeholder');
    const stage = $('stage');
    const listEl = $('list');
    const seek = $('seek');
    const volume = $('volume');
    const speed = $('speed');
    const statusEl = $('status');
    const timeEl = $('time');
    const toggleBtn = $('toggle');
    const muteBtn = $('mute');
    const fsBtn = $('fullscreen');
    const prevBtn = $('prev');
    const nextBtn = $('next');
    const stopBtn = $('stop');
    const backBtn = $('back');
    const fwdBtn = $('fwd');
    const help = $('help');

    const ALLOWED = { mp4: 'video', mp3: 'audio' };
    const SPEEDS = [0.5, 1, 1.5, 2];

    let items = []; // { name, url, kind, duration }
    let current = -1;
    let seeking = false;

    function fmt(sec) {
        if (!Number.isFinite(sec) || sec < 0) sec = 0;
        const s = Math.floor(sec);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    }

    function setStatus(text, isError) {
        statusEl.textContent = text || '';
        statusEl.classList.toggle('error', !!isError);
    }

    function extOf(name) {
        const i = name.lastIndexOf('.');
        return i < 0 ? '' : name.slice(i + 1).toLowerCase();
    }

    function addFiles(fileList) {
        const rejected = [];
        const firstNew = items.length;
        for (const file of fileList) {
            const kind = ALLOWED[extOf(file.name)];
            if (!kind) {
                rejected.push(file.name);
                continue;
            }
            items.push({ name: file.name, url: URL.createObjectURL(file), kind, duration: null });
        }
        const added = items.length - firstNew;
        renderList();
        if (added && current < 0) play(firstNew);
        if (rejected.length) {
            setStatus(`Not supported (only MP4 and MP3): ${rejected.join(', ')}`, true);
        } else if (added) {
            setStatus(`Added ${added} file${added === 1 ? '' : 's'}.`);
        }
    }

    function renderList() {
        listEl.innerHTML = '';
        items.forEach((item, i) => {
            const li = document.createElement('li');
            li.textContent = item.name;
            li.title = item.name;
            if (i === current) li.classList.add('current');
            const dur = document.createElement('span');
            dur.className = 'dur';
            dur.textContent = item.duration != null ? fmt(item.duration) : '';
            li.prepend(dur);
            li.addEventListener('click', () => play(i));
            listEl.appendChild(li);
        });
        const hasItems = items.length > 0;
        [toggleBtn, stopBtn, muteBtn, fsBtn, seek, speed, backBtn, fwdBtn].forEach((el) => {
            el.disabled = !hasItems;
        });
        prevBtn.disabled = !hasItems || current <= 0;
        nextBtn.disabled = !hasItems || current >= items.length - 1;
    }

    function play(index) {
        if (index < 0 || index >= items.length) return;
        current = index;
        const item = items[index];
        const isVideo = item.kind === 'video';
        video.classList.toggle('hidden', !isVideo);
        art.classList.toggle('show', !isVideo);
        artName.textContent = item.name;
        placeholder.style.display = 'none';
        video.src = item.url;
        video.playbackRate = Number(speed.value) || 1;
        video.play().catch(() => {});
        renderList();
        setStatus(`Playing ${item.name}`);
    }

    function togglePlay() {
        if (current < 0) return;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    }

    function stop() {
        if (current < 0) return;
        video.pause();
        video.currentTime = 0;
        updateTime();
    }

    function step(delta) {
        if (current < 0) return;
        const dur = Number.isFinite(video.duration) ? video.duration : Infinity;
        video.currentTime = Math.max(0, Math.min(dur, video.currentTime + delta));
    }

    function setVolume(percent) {
        const v = Math.max(0, Math.min(100, percent));
        volume.value = String(v);
        video.volume = v / 100;
        video.muted = false;
        updateMute();
    }

    function updateMute() {
        muteBtn.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
    }

    function cycleSpeed(dir) {
        const idx = SPEEDS.indexOf(Number(speed.value));
        const next = Math.max(0, Math.min(SPEEDS.length - 1, (idx < 0 ? 1 : idx) + dir));
        speed.value = String(SPEEDS[next]);
        video.playbackRate = SPEEDS[next];
        setStatus(`Speed ${SPEEDS[next]}×`);
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else stage.requestFullscreen().catch(() => {});
    }

    function updateTime() {
        const dur = video.duration;
        timeEl.textContent = `${fmt(video.currentTime)} / ${fmt(dur)}`;
        if (!seeking && Number.isFinite(dur) && dur > 0) {
            seek.value = String(Math.round((video.currentTime / dur) * 1000));
        }
        toggleBtn.textContent = video.paused ? '▶' : '❚❚';
    }

    // Media element events
    video.addEventListener('loadedmetadata', () => {
        if (current >= 0) {
            items[current].duration = video.duration;
            renderList();
        }
        updateTime();
    });
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('play', updateTime);
    video.addEventListener('pause', updateTime);
    video.addEventListener('volumechange', () => {
        volume.value = String(Math.round(video.volume * 100));
        updateMute();
    });
    video.addEventListener('ended', () => {
        if (current < items.length - 1) play(current + 1);
        else {
            updateTime();
            setStatus('End of playlist.');
        }
    });
    video.addEventListener('error', () => {
        if (current < 0) return;
        setStatus(`Could not play ${items[current].name}. The file may be damaged.`, true);
    });

    // Controls
    seek.addEventListener('input', () => {
        seeking = true;
        const dur = video.duration;
        if (Number.isFinite(dur)) {
            timeEl.textContent = `${fmt((Number(seek.value) / 1000) * dur)} / ${fmt(dur)}`;
        }
    });
    seek.addEventListener('change', () => {
        seeking = false;
        const dur = video.duration;
        if (Number.isFinite(dur)) video.currentTime = (Number(seek.value) / 1000) * dur;
    });
    volume.addEventListener('input', () => setVolume(Number(volume.value)));
    speed.addEventListener('change', () => {
        video.playbackRate = Number(speed.value);
    });
    toggleBtn.addEventListener('click', togglePlay);
    stopBtn.addEventListener('click', stop);
    prevBtn.addEventListener('click', () => play(current - 1));
    nextBtn.addEventListener('click', () => play(current + 1));
    backBtn.addEventListener('click', () => step(-10));
    fwdBtn.addEventListener('click', () => step(10));
    muteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        updateMute();
    });
    fsBtn.addEventListener('click', toggleFullscreen);

    $('menu-open').addEventListener('click', () => $('file').click());
    $('file').addEventListener('change', (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    });
    $('menu-play').addEventListener('click', togglePlay);
    $('menu-help').addEventListener('click', () => help.showModal());
    $('help-close').addEventListener('click', () => help.close());

    // Drag and drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        stage.classList.add('dragging');
    });
    document.addEventListener('dragleave', (e) => {
        if (!e.relatedTarget) stage.classList.remove('dragging');
    });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        stage.classList.remove('dragging');
        if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    // Keyboard shortcuts (ignored while the help dialog is open)
    document.addEventListener('keydown', (e) => {
        if (help.open) return;
        switch (e.key) {
            case ' ': togglePlay(); break;
            case 'ArrowLeft': step(-10); break;
            case 'ArrowRight': step(10); break;
            case 'ArrowUp': setVolume(Number(volume.value) + 5); break;
            case 'ArrowDown': setVolume(Number(volume.value) - 5); break;
            case 'm': case 'M': muteBtn.click(); break;
            case 'f': case 'F': toggleFullscreen(); break;
            case 's': case 'S': stop(); break;
            case 'p': case 'P': play(current - 1); break;
            case 'n': case 'N': play(current + 1); break;
            case '[': cycleSpeed(-1); break;
            case ']': cycleSpeed(1); break;
            default: return;
        }
        e.preventDefault();
    });

    video.volume = Number(volume.value) / 100;
    renderList();
    updateTime();
})();
