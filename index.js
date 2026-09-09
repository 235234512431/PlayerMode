import { createCredential, verifyPassword } from './security.js';
import { createSettingsStore, validSettings } from './settings.js';

(() => {
    const context = globalThis.SillyTavern?.getContext?.();
    if (!context?.eventSource || !context.eventTypes?.APP_READY) {
        console.warn('[PlayerMode] Extension API unavailable.'); return;
    }
    const store = createSettingsStore(context);
    const selectors = {
        shell: '#sheld', chat: '#chat', input: '#send_textarea', send: '#send_but', stop: '#mes_stop',
        newChat: '#option_start_new_chat', settings: '#extensions_settings',
    };
    let active = false, ready = false, dialogOpen = false, configured = false;
    let toolbar, title, exit, enter, settingsButton, status;
    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    function button(text, handler, variant = '') {
        const node = el('button', `pm-button ${variant}`, text);
        node.type = 'button'; node.addEventListener('click', handler); return node;
    }
    let statusTimer;
    function notify(message) {
        clearTimeout(statusTimer); status.textContent = message;
        statusTimer = setTimeout(() => { status.textContent = ''; }, 6500);
    }
    function setMode(next) {
        if (next && ['shell', 'chat', 'input', 'send', 'stop'].some(key => !document.querySelector(selectors[key]))) {
            notify('找不到必要的聊天界面，请检查 SillyTavern 版本。');
            console.warn('[PlayerMode] Essential DOM missing.'); return;
        }
        active = next;
        document.body.classList.toggle('playermode-active', next);
        toolbar.hidden = !next;
        enter.hidden = next || !configured;
        console.log(`[PlayerMode] ${next ? 'ON' : 'OFF'}`);
    }
    function updateTitle() {
        const current = globalThis.SillyTavern.getContext();
        title.textContent = current.name2 || '当前对话';
    }
    function showPassword(kind) {
        if (dialogOpen) return;
        dialogOpen = true;
        const trigger = document.activeElement;
        const dialog = el('dialog', 'pm-dialog');
        const form = el('form', 'pm-form'); form.noValidate = true;
        const heading = el('h2', '', kind === 'exit' ? '返回普通界面' : '统一退出密码');
        heading.id = 'pm-dialog-title';
        const help = el('p', 'pm-muted', kind === 'exit' ? '输入管理员设置的密码，解锁当前页面。刷新后重新进入玩家模式。' : '所有使用同一账户的浏览器将使用这个密码。设置完成后再邀请朋友访问。');
        help.id = 'pm-dialog-help';
        dialog.setAttribute('aria-labelledby', heading.id);
        dialog.setAttribute('aria-describedby', help.id);
        form.append(el('span', 'pm-eyebrow', 'PLAYERMODE'), heading, help);
        const fields = {};
        function field(key, label, autocomplete) {
            const group = el('div', 'pm-field');
            const input = el('input'); input.type = 'password'; input.id = `pm-${key}`;
            input.autocomplete = autocomplete;
            input.setAttribute('aria-describedby', 'pm-error');
            const caption = el('label', '', label); caption.htmlFor = input.id;
            const row = el('div', 'pm-password-row');
            const reveal = button('显示', () => {
                input.type = input.type === 'password' ? 'text' : 'password';
                reveal.textContent = input.type === 'password' ? '显示' : '隐藏';
                reveal.setAttribute('aria-label', `${reveal.textContent}${label}`);
                reveal.setAttribute('aria-pressed', String(input.type === 'text'));
            });
            reveal.setAttribute('aria-label', `显示${label}`);
            row.append(input, reveal); group.append(caption, row); form.append(group); fields[key] = input;
        }
        if (kind === 'exit' || configured) field('current', '当前退出密码', 'current-password');
        if (kind !== 'exit') { field('password', '新密码（至少 8 个字符）', 'new-password'); field('confirm', '再次输入新密码', 'new-password'); }
        const error = el('p', 'pm-error'); error.id = 'pm-error'; error.setAttribute('role', 'alert');
        const actions = el('div', 'pm-dialog-actions');
        let pending = false;
        function close() {
            if (pending) return;
            Object.values(fields).forEach(input => { input.value = ''; });
            dialog.close(); dialog.remove(); dialogOpen = false;
            if (trigger?.isConnected) trigger.focus();
        }
        const cancel = button('取消', close);
        const submit = el('button', 'pm-button pm-primary', kind === 'exit' ? '验证并退出' : '保存并开启'); submit.type = 'submit';
        actions.append(cancel, submit); form.append(error, actions); dialog.append(form);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        form.addEventListener('submit', async event => {
            event.preventDefault(); if (pending) return;
            error.textContent = '';
            Object.values(fields).forEach(input => input.removeAttribute('aria-invalid'));
            function invalid(input, message) { input?.setAttribute('aria-invalid', 'true'); input?.focus(); throw new Error(message); }
            try {
                if (kind !== 'exit' && fields.password.value.length < 8) invalid(fields.password, '新密码至少需要 8 个字符。');
                if (kind !== 'exit' && fields.password.value !== fields.confirm.value) invalid(fields.confirm, '两次新密码不一致。');
                pending = true; submit.disabled = true; cancel.disabled = true; form.setAttribute('aria-busy', 'true');
                const latest = await store.read();
                if (latest) {
                    if (!fields.current) throw new Error('另一页面已设置密码。请关闭窗口，刷新后使用现有密码。');
                    if (!await verifyPassword(fields.current.value, latest.credential)) invalid(fields.current, '密码不正确，请重新输入。');
                } else if (kind === 'exit' || configured) throw new Error('共享密码配置已移除，请联系管理员恢复。');
                if (kind === 'exit') {
                    context.extensionSettings.PlayerMode = latest;
                    pending = false; close(); setMode(false);
                } else {
                    const credential = await createCredential(fields.password.value);
                    await store.save({ version: 1, credential });
                    configured = true;
                    pending = false; close(); setMode(true); notify('密码已保存，玩家模式已开启。');
                }
            } catch (failure) {
                error.textContent = globalThis.crypto?.subtle ? failure.message : '密码功能需要 HTTPS 或 localhost，请检查访问地址。';
            } finally {
                pending = false; submit.disabled = false; cancel.disabled = false; form.removeAttribute('aria-busy');
            }
        });
        document.body.append(dialog); dialog.showModal(); Object.values(fields)[0].focus();
    }
    function initialize() {
        if (ready) return; ready = true;
        toolbar = el('header', 'pm-toolbar');
        const identity = el('div', 'pm-identity');
        title = el('h1', 'pm-title'); identity.append(el('span', 'pm-eyebrow', 'PLAYERMODE · 对话'), title);
        const actions = el('div', 'pm-actions');
        const newChat = button('＋ 新对话', () => {
            const native = document.querySelector(selectors.newChat);
            if (native) native.click(); else notify('找不到原生新对话入口，请检查版本。');
        });
        exit = button('退出玩家模式', () => showPassword('exit'), 'pm-quiet');
        actions.append(newChat, exit); toolbar.append(identity, actions);
        status = el('div', 'pm-status'); status.setAttribute('role', 'status');
        enter = button('进入玩家模式', () => setMode(true)); enter.classList.add('pm-enter');
        document.body.append(toolbar, enter, status);
        const panel = el('section', 'pm-settings');
        settingsButton = button('设置／修改统一退出密码', () => showPassword('setup'));
        panel.append(el('h3', '', 'PlayerMode'), el('p', '', '统一密码保存在当前 SillyTavern 账户。刷新后自动进入玩家模式。'), settingsButton);
        const host = document.querySelector(selectors.settings);
        if (host) host.append(panel); else console.warn('[PlayerMode] Settings host missing.');
        const value = context.extensionSettings.PlayerMode;
        configured = validSettings(value);
        // Old browser-local credentials and ON/OFF state are never trusted or imported.
        updateTitle(); setMode(configured);
        if (value && !configured) notify('共享密码配置异常，请在扩展设置中恢复；未使用旧浏览器密码。');
        else if (!configured) notify('请先在扩展设置中配置统一退出密码。');
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, updateTitle);
        document.addEventListener('keydown', event => {
            if (active && !event.isComposing && event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
                event.preventDefault(); showPassword('exit');
            }
        }, true);
        console.log('[PlayerMode] Initialized 0.3.0');
    }
    context.eventSource.on(context.eventTypes.APP_READY, initialize);
})();
