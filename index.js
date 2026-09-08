/* PlayerMode changes presentation only. Native chat nodes and handlers stay intact. */
(() => {
    'use strict';
    const modeClass = 'playermode-active';
    const selectors = Object.freeze({
        shell: '#sheld', chat: '#chat', form: '#send_form',
        input: '#send_textarea', send: '#send_but', stop: '#mes_stop',
    });
    let toggle;
    let active = false;
    let initialized = false;
    const forcedOff = new URLSearchParams(location.search).get('playermode') === '0';

    function setMode(next) {
        if (next && forcedOff) return;
        if (next) {
            const missing = Object.values(selectors).filter(selector => !document.querySelector(selector));
            if (missing.length) {
                console.warn('[PlayerMode] Missing essential DOM; staying OFF:', missing.join(', '));
                return;
            }
        }
        active = next;
        document.body.classList.toggle(modeClass, active);
        toggle.textContent = active ? 'PlayerMode ON · 退出' : 'PlayerMode OFF · 开启';
        toggle.setAttribute('aria-pressed', String(active));
        console.log(`[PlayerMode] ${active ? 'ON' : 'OFF'}`);
    }

    function onKey(event) {
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
            event.preventDefault();
            setMode(false);
        }
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        // No settings writes: each page load starts OFF, even after disabling/removing.
        document.body.classList.remove(modeClass);
        toggle = document.createElement('button');
        toggle.id = 'playermode-toggle';
        toggle.type = 'button';
        toggle.title = '关闭：Ctrl+Shift+P；应急恢复：网址添加 ?playermode=0 后重新加载';
        // Inline fallback keeps the exit accessible if the extension stylesheet fails.
        Object.assign(toggle.style, {
            position: 'fixed', top: '8px', right: '8px', zIndex: '2147483647',
            display: 'block', padding: '6px 10px', background: '#20242b',
            color: '#fff', border: '1px solid #818b99', borderRadius: '6px',
            fontSize: '12px', cursor: 'pointer',
        });
        toggle.addEventListener('click', () => setMode(!active));
        document.body.append(toggle);
        document.addEventListener('keydown', onKey, true);
        setMode(false);
        if (forcedOff) {
            toggle.disabled = true;
            toggle.textContent = 'PlayerMode OFF · URL 安全模式';
        }
        console.log('[PlayerMode] Initialized');
    }

    const context = globalThis.SillyTavern?.getContext?.();
    if (!context?.eventSource || !context.eventTypes?.APP_READY) {
        console.warn('[PlayerMode] Extension API unavailable; UI left unchanged.');
        return;
    }
    // In ST 1.18.0 APP_READY is replayed to late listeners by EventEmitter.
    context.eventSource.on(context.eventTypes.APP_READY, initialize);
})();
