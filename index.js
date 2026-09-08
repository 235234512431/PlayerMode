import { createCredential, validCredential, verifyPassword } from './security.js';

/* Only presentation changes: original chat nodes and generation handlers stay intact. */
(() => {
    'use strict';
    const modeClass = 'playermode-active';
    const storageKey = 'PlayerMode.preferences.v1';
    const selectors = Object.freeze({
        shell: '#sheld', chat: '#chat', form: '#send_form',
        input: '#send_textarea', send: '#send_but', stop: '#mes_stop',
        newChat: '#option_start_new_chat',
    });
    let toggle, newChatButton, passwordButton;
    let active = false;
    let initialized = false;
    let busy = false;
    let preferences = { enabled: false, credential: null };

    function report(message, error) {
        console.warn('[PlayerMode]', message, error?.name ?? '');
        window.alert(message);
    }

    function savePreferences(next) {
        // Save before changing UI, so a failed write cannot silently unlock on refresh.
        localStorage.setItem(storageKey, JSON.stringify(next));
        preferences = next;
    }

    function renderMode(next) {
        active = next;
        document.body.classList.toggle(modeClass, active);
        toggle.textContent = active ? 'PlayerMode · 退出' : 'PlayerMode · 开启';
        toggle.setAttribute('aria-pressed', String(active));
        newChatButton.hidden = !active;
        passwordButton.hidden = active;
        console.log(`[PlayerMode] ${active ? 'ON' : 'OFF'}`);
    }

    function hasChatDOM() {
        const missing = Object.entries(selectors).filter(([key, selector]) => key !== 'newChat' && !document.querySelector(selector));
        if (!missing.length) return true;
        report('找不到必要的聊天界面，PlayerMode 未开启。请检查 SillyTavern 版本。');
        return false;
    }

    function askPassword(setup) {
        return new Promise(resolve => {
            const dialog = document.createElement('dialog');
            dialog.className = 'playermode-dialog';
            const form = document.createElement('form');
            form.method = 'dialog';
            const title = document.createElement('h3');
            title.textContent = setup ? '设置 PlayerMode 退出密码' : '输入密码退出 PlayerMode';
            const help = document.createElement('p');
            help.textContent = setup ? '至少 8 个字符。仅保存在当前浏览器，不与其他设备同步。请勿使用重要账号的密码。' : '验证通过后恢复普通界面。';
            const input = document.createElement('input');
            input.type = 'password'; input.required = true;
            input.autocomplete = setup ? 'new-password' : 'current-password';
            input.setAttribute('aria-label', '退出密码');
            const confirm = document.createElement('input');
            confirm.type = 'password'; confirm.required = true;
            confirm.autocomplete = 'new-password';
            confirm.setAttribute('aria-label', '再次输入退出密码');
            const error = document.createElement('p');
            error.setAttribute('role', 'alert');
            const submit = document.createElement('button');
            submit.type = 'submit'; submit.textContent = setup ? '保存密码' : '验证并退出';
            const cancel = document.createElement('button');
            cancel.type = 'button'; cancel.textContent = '取消';
            form.append(title, help, input);
            if (setup) form.append(confirm);
            form.append(error, submit, cancel);
            dialog.append(form);
            let settled = false;
            const finish = value => {
                if (settled) return;
                settled = true;
                input.value = ''; confirm.value = '';
                dialog.remove(); resolve(value);
            };
            cancel.addEventListener('click', () => finish(null));
            dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
            form.addEventListener('submit', event => {
                event.preventDefault();
                if (setup && (input.value.length < 8 || input.value !== confirm.value)) {
                    error.textContent = '密码须至少 8 个字符，且两次输入一致。';
                    return;
                }
                finish(input.value);
            });
            document.body.append(dialog);
            try { dialog.showModal(); input.focus(); }
            catch (error) { finish(null); report('无法打开密码窗口，请更新浏览器。', error); }
        });
    }

    async function setupPassword() {
        const password = await askPassword(true);
        if (password === null) return false;
        const credential = await createCredential(password);
        savePreferences({ ...preferences, credential });
        return true;
    }

    async function changeMode() {
        if (busy) return;
        busy = true;
        try {
            if (active) {
                const password = await askPassword(false);
                if (password === null) return;
                if (!await verifyPassword(password, preferences.credential)) {
                    report('密码不正确，仍保持 PlayerMode。');
                    return;
                }
                savePreferences({ ...preferences, enabled: false });
                renderMode(false);
            } else {
                if (!hasChatDOM()) return;
                if (!validCredential(preferences.credential) && !await setupPassword()) return;
                savePreferences({ ...preferences, enabled: true });
                renderMode(true);
            }
        } catch (error) {
            report('操作未完成。请确认浏览器允许本地存储，且使用 HTTPS 或 localhost。忘记密码时可禁用扩展后刷新。', error);
        } finally { busy = false; }
    }

    async function changePassword() {
        if (busy || active) return;
        busy = true;
        try { await setupPassword(); }
        catch (error) { report('密码保存失败，请使用 HTTPS 或 localhost 并允许本地存储。', error); }
        finally { busy = false; }
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        document.body.classList.remove(modeClass);
        const toolbar = document.createElement('div');
        toolbar.id = 'playermode-toolbar';
        Object.assign(toolbar.style, { position: 'fixed', top: '8px', right: '8px', zIndex: '2147483647', display: 'flex', gap: '6px', maxWidth: 'calc(100vw - 16px)' });
        function button(label, handler) {
            const element = document.createElement('button');
            element.type = 'button'; element.textContent = label;
            Object.assign(element.style, { padding: '6px 8px', background: '#20242b', color: '#fff', border: '1px solid #818b99', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' });
            element.addEventListener('click', handler);
            toolbar.append(element);
            return element;
        }
        newChatButton = button('新对话', () => {
            // The native delegated click handler retains its confirmation and generation guard.
            const native = document.querySelector(selectors.newChat);
            if (!native) { report('找不到原生新对话入口，请检查 SillyTavern 版本。'); return; }
            if (!busy) native.click();
        });
        passwordButton = button('设置退出密码', changePassword);
        toggle = button('PlayerMode', changeMode);
        toggle.id = 'playermode-toggle';
        toggle.title = '退出需要密码；Ctrl+Shift+P 同样需要验证';
        document.body.append(toolbar);
        document.addEventListener('keydown', event => {
            if (active && event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
                event.preventDefault(); void changeMode();
            }
        }, true);
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
            if (saved && typeof saved.enabled === 'boolean' && validCredential(saved.credential)) preferences = saved;
            else if (saved) console.warn('[PlayerMode] Invalid preferences; starting OFF.');
        } catch (error) { console.warn('[PlayerMode] Cannot read preferences; starting OFF.', error.name); }
        renderMode(preferences.enabled && hasChatDOM());
        // No URL or keyboard bypass. Disabling the extension and reloading is recovery.
        console.log('[PlayerMode] Initialized');
    }

    const context = globalThis.SillyTavern?.getContext?.();
    if (!context?.eventSource || !context.eventTypes?.APP_READY) {
        console.warn('[PlayerMode] Extension API unavailable; UI left unchanged.');
        return;
    }
    context.eventSource.on(context.eventTypes.APP_READY, initialize);
})();
