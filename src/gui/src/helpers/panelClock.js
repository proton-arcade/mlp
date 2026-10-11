/*
 * Clock at the right end of the bottom panel, as in Linux Mint's Cinnamon panel.
 * Shows the time and the date on two lines and refreshes every 15 seconds.
 */
export function mountPanelClock () {
    const bar = document.querySelector('.taskbar');
    if ( ! bar || bar.querySelector('.mint-clock') ) return;

    const el = document.createElement('div');
    el.className = 'mint-clock';
    el.setAttribute('role', 'timer');
    bar.appendChild(el);

    const tick = () => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        el.innerHTML = `<span class="mint-clock-time">${time}</span><span class="mint-clock-date">${date}</span>`;
    };
    tick();
    setInterval(tick, 15000);
}
