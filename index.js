import { createCredential, verifyPassword } from './security.js';
import { createSettingsStore, validSettings } from './settings.js';
import { createNavigation, allowedCharacters } from './navigation.js';
import { createLibrary } from './library.js';
import { host } from './host.js';
import { themes, createThemePreference } from './themes.js';

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
    let toolbar, title, exit, enter, settingsButton, status, library, accountLabel, connectionLabel, appearance;
    const getContext = () => globalThis.SillyTavern.getContext();
    const getSettings = () => getContext().extensionSettings.PlayerMode;
    const navigation = createNavigation(getContext, host.isGenerating, getSettings, () => {
        const native = document.querySelector(selectors.newChat);
        if (!native) throw new Error('找不到原生新对话入口，请检查版本。');
        native.click();
    });
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
        if (!next) hideLibrary();
        document.body.classList.toggle('playermode-active', next);
        toolbar.hidden = !next;
        enter.hidden = next || !configured;
        if (next && !currentCard()) showLibrary();
        console.log(`[PlayerMode] ${next ? 'ON' : 'OFF'}`);
    }
    function currentCard() {
        const current = getContext();
        if (current.groupId) return null;
        return allowedCharacters(current, getSettings()).find(card => String(card.id) === String(current.characterId));
    }
    function updateTitle() {
        title.textContent = currentCard()?.name || '故事书房';
        const account = host.account();
        accountLabel.textContent = account.enabled ? `账户 · ${account.name}` : '默认账户 · 尚未启用账号隔离';
        const online = getContext().onlineStatus;
        connectionLabel.textContent = host.isGenerating() ? '正在回复…' : (!online || online === 'no_connection') ? '尚未连接模型' : '已连接 · 可以开始对话';
        connectionLabel.dataset.state = host.isGenerating() ? 'generating' : (!online || online === 'no_connection') ? 'offline' : 'ready';
    }
    function showLibrary() {
        try { navigation.guard(); } catch (error) { notify(error.message); return; }
        library.root.hidden = false;
        document.body.classList.add('pm-browsing');
        library.show();
        library.root.querySelector('h2')?.focus();
    }
    function hideLibrary() {
        if (!library) return;
        const wasOpen = !library.root.hidden;
        library.root.hidden = true; library.cancel();
        document.body.classList.remove('pm-browsing');
        if (wasOpen && active) document.querySelector(selectors.input)?.focus();
    }
    function checkDraft() {
        if (document.querySelector(selectors.input)?.value?.trim()) throw new Error('输入框里还有未发送的内容，请先发送或清空，再切换对话。');
    }
    async function newConversation() {
        try {
            checkDraft();
            const avatar = !library.root.hidden ? getSettings()?.defaultAvatar : currentCard()?.avatar || getSettings()?.defaultAvatar;
            if (!avatar) { showLibrary(); return; }
            await navigation.newChat(avatar); hideLibrary(); updateTitle();
        } catch (error) { notify(error.message); }
    }
    function switchAccount() {
        try { navigation.guard(); checkDraft(); } catch (error) { notify(error.message); return; }
        if (!host.account().enabled) { notify('请先由管理员启用 SillyTavern 原生多用户。'); return; }
        if (dialogOpen) return;
        dialogOpen = true;
        const trigger = document.activeElement;
        const dialog = el('dialog', 'pm-dialog');
        const title = el('h2', '', '切换账户'); title.id = 'pm-account-title';
        dialog.setAttribute('aria-labelledby', title.id);
        dialog.append(title, el('p', 'pm-muted', '保存当前对话后退出登录，在酒馆登录页选择另一个账户。'));
        let pending = false;
        const close = () => { if (pending) return; dialog.close(); dialog.remove(); dialogOpen = false; trigger?.focus(); };
        const error = el('p', 'pm-error'); error.setAttribute('role', 'alert');
        const cancel = button('取消', close);
        const confirm = button('保存并切换账户', async () => {
            if (pending) return;
            pending = true; confirm.disabled = true; cancel.disabled = true;
            try {
                if (host.isGenerating()) throw new Error('请先等待回复完成。');
                await getContext().saveChat();
                const native = document.querySelector('#logout_button');
                if (!native) throw new Error('找不到原生退出登录入口。');
                native.click();
                pending = false; close();
            } catch (failure) { error.textContent = failure.message; }
            finally { pending = false; confirm.disabled = false; cancel.disabled = false; }
        });
        const actions = el('div', 'pm-dialog-actions'); actions.append(cancel, confirm);
        dialog.append(error, actions);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        document.body.append(dialog); dialog.showModal(); cancel.focus();
    }
    function showThemes() {
        if (dialogOpen) return;
        dialogOpen = true;
        const trigger = document.activeElement;
        const dialog = el('dialog', 'pm-dialog');
        const form = el('form', 'pm-form'); form.noValidate = true;
        const heading = el('h2', '', '选择故事的光线'); heading.id = 'pm-theme-title';
        const help = el('p', 'pm-muted', '选择后即时预览。只记住本浏览器中当前账户的外观。'); help.id = 'pm-theme-help';
        dialog.setAttribute('aria-labelledby', heading.id); dialog.setAttribute('aria-describedby', help.id);
        const choices = el('fieldset', 'pm-theme-options');
        choices.append(el('legend', 'pm-muted', '界面主题'));
        let chosen = appearance.value;
        const reading = appearance.reading;
        let first;
        themes.forEach(theme => {
            const label = el('label', 'pm-theme-choice'); label.dataset.pmPalette = theme.id;
            const input = el('input'); input.type = 'radio'; input.name = 'pm-theme'; input.value = theme.id;
            input.checked = chosen === theme.id; input.id = `pm-theme-${theme.id}`; label.htmlFor = input.id;
            const copy = el('span', 'pm-theme-copy');
            copy.append(el('strong', '', theme.name), el('span', 'pm-muted', theme.description));
            const swatches = el('span', 'pm-theme-swatches'); swatches.setAttribute('aria-hidden', 'true');
            ['bg', 'surface', 'accent'].forEach(tone => swatches.append(el('i', `pm-swatch-${tone}`)));
            label.append(input, copy, swatches); choices.append(label);
            input.addEventListener('change', () => { if (input.checked) { chosen = theme.id; appearance.preview(chosen, reading); } });
            if (input.checked) first = input;
        });
        function close() {
            appearance.restore(); dialog.close(); dialog.remove(); dialogOpen = false;
            if (trigger?.isConnected) trigger.focus();
        }
        const readingPanel = el('fieldset', 'pm-reading-controls');
        readingPanel.append(el('legend', '', '阅读舒适度'));
        function range(key, name, min, max, step, format) {
            const row = el('div', 'pm-reading-control');
            const label = el('label', '', name); label.htmlFor = `pm-reading-${key}`;
            const value = el('output'); value.htmlFor = label.htmlFor;
            const input = el('input'); input.type = 'range'; input.id = label.htmlFor;
            input.min = min; input.max = max; input.step = step; input.value = reading[key];
            function update() {
                reading[key] = Number(input.value); value.textContent = format(reading[key]);
                input.setAttribute('aria-valuetext', value.textContent); appearance.preview(chosen, reading);
            }
            value.textContent = format(reading[key]); input.setAttribute('aria-valuetext', value.textContent);
            input.addEventListener('input', update); row.append(label, value, input); readingPanel.append(row);
        }
        range('fontSize', '正文字号', 14, 22, 1, value => `${value} px`);
        range('lineHeight', '文字行距', 1.6, 2.2, 0.05, value => `${value.toFixed(2)} 倍`);
        const sample = el('p', 'pm-reading-sample', '雨停以后，书页还留着夜的温度。\n“慢慢读，故事会等你。”');
        readingPanel.append(sample);
        const actions = el('div', 'pm-dialog-actions');
        const save = el('button', 'pm-button pm-primary', '应用外观'); save.type = 'submit';
        actions.append(button('取消', close), save);
        form.append(heading, help, choices, readingPanel, actions); dialog.append(form);
        form.addEventListener('submit', event => {
            event.preventDefault();
            const persisted = appearance.choose(chosen, reading); close();
            notify(persisted ? '主题已应用，本浏览器会记住你的选择。' : '主题已应用；浏览器无法保存偏好，刷新后可能恢复原主题。');
        });
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        document.body.append(dialog); dialog.showModal(); first?.focus();
    }
    function showPassword(kind) {
        if (dialogOpen) return;
        dialogOpen = true;
        const trigger = document.activeElement;
        const dialog = el('dialog', 'pm-dialog');
        const form = el('form', 'pm-form'); form.noValidate = true;
        const heading = el('h2', '', kind === 'exit' ? '返回普通界面' : kind === 'roles' ? '开放角色与默认角色' : '统一退出密码');
        heading.id = 'pm-dialog-title';
        const help = el('p', 'pm-muted', kind === 'exit' ? '输入管理员设置的密码，解锁当前页面。刷新后重新进入玩家模式。' : kind === 'roles' ? '由你决定玩家能遇见谁。验证退出密码后，修改本账户的故事范围。' : '所有使用同一账户的浏览器将使用这个密码。设置完成后再邀请朋友访问。');
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
        if (kind === 'setup') { field('password', '新密码（至少 8 个字符）', 'new-password'); field('confirm', '再次输入新密码', 'new-password'); }
        const roleInputs = [];
        let allowAll;
        if (kind === 'roles') {
            form.append(el('p', 'pm-muted', '只开放本账户已有角色。默认角色用于从主界面新建对话；请先在原生界面为角色绑定世界书。'));
            const allRow = el('div', 'pm-role-option');
            allowAll = el('input'); allowAll.type = 'checkbox'; allowAll.id = 'pm-allow-all';
            allowAll.checked = getSettings()?.allowAllCharacters === true;
            const allLabel = el('label', '', '开放本账户全部角色（包含以后新增的角色）'); allLabel.htmlFor = allowAll.id;
            allRow.append(allowAll, allLabel); form.append(allRow);
            const available = getContext().characters ?? [];
            available.forEach((card, index) => {
                const row = el('div', 'pm-role-option');
                const check = el('input'); check.type = 'checkbox'; check.id = `pm-allow-${index}`;
                check.checked = (getSettings()?.allowedAvatars ?? []).includes(card.avatar);
                const label = el('label', '', card.name || '未命名角色'); label.htmlFor = check.id;
                const radio = el('input'); radio.type = 'radio'; radio.name = 'pm-default'; radio.id = `pm-default-${index}`;
                radio.checked = getSettings()?.defaultAvatar === card.avatar;
                radio.setAttribute('aria-label', `将${card.name || '未命名角色'}设为默认`);
                const defaultLabel = el('label', '', '设为默认'); defaultLabel.htmlFor = radio.id;
                row.append(check, label, radio, defaultLabel); form.append(row);
                roleInputs.push({ avatar: card.avatar, check, radio });
            });
            function updateRoleChecks() { roleInputs.forEach(item => { item.check.disabled = allowAll.checked; }); }
            allowAll.addEventListener('change', updateRoleChecks); updateRoleChecks();
            if (!available.length) form.append(el('p', 'pm-empty', '本账户还没有角色，请先返回原生界面导入角色卡。'));
        }
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
        const submit = el('button', 'pm-button pm-primary', kind === 'exit' ? '验证并退出' : kind === 'roles' ? '保存角色配置' : '保存并开启'); submit.type = 'submit';
        actions.append(cancel, submit); form.append(error, actions); dialog.append(form);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        form.addEventListener('submit', async event => {
            event.preventDefault(); if (pending) return;
            error.textContent = '';
            Object.values(fields).forEach(input => input.removeAttribute('aria-invalid'));
            function invalid(input, message) { input?.setAttribute('aria-invalid', 'true'); input?.focus(); throw new Error(message); }
            try {
                if (kind === 'setup' && fields.password.value.length < 8) invalid(fields.password, '新密码至少需要 8 个字符。');
                if (kind === 'setup' && fields.password.value !== fields.confirm.value) invalid(fields.confirm, '两次新密码不一致。');
                pending = true; submit.disabled = true; cancel.disabled = true; form.setAttribute('aria-busy', 'true');
                const latest = await store.read();
                if (latest) {
                    if (!fields.current) throw new Error('另一页面已设置密码。请关闭窗口，刷新后使用现有密码。');
                    if (!await verifyPassword(fields.current.value, latest.credential)) invalid(fields.current, '密码不正确，请重新输入。');
                } else if (kind === 'exit' || configured) throw new Error('共享密码配置已移除，请联系管理员恢复。');
                if (kind === 'exit') {
                    context.extensionSettings.PlayerMode = latest;
                    pending = false; close(); setMode(false);
                } else if (kind === 'roles') {
                    if (!latest) throw new Error('请先设置退出密码。');
                    const allowedAvatars = roleInputs.filter(item => item.check.checked).map(item => item.avatar);
                    const defaultAvatar = roleInputs.find(item => item.radio.checked)?.avatar;
                    if (!defaultAvatar || (!allowAll.checked && (!allowedAvatars.length || !allowedAvatars.includes(defaultAvatar)))) throw new Error('至少开放一个角色，并从开放角色中选择默认角色。');
                    await store.save({ ...latest, allowedAvatars, defaultAvatar, allowAllCharacters: allowAll.checked });
                    pending = false; close(); notify('角色范围已保存。'); updateTitle();
                } else {
                    const credential = await createCredential(fields.password.value);
                    await store.save({ ...latest, version: 1, credential });
                    configured = true;
                    pending = false; close(); setMode(true); notify('密码已保存，玩家模式已开启。');
                }
            } catch (failure) {
                error.textContent = globalThis.crypto?.subtle ? failure.message : '密码功能需要 HTTPS 或 localhost，请检查访问地址。';
            } finally {
                pending = false; submit.disabled = false; cancel.disabled = false; form.removeAttribute('aria-busy');
            }
        });
        document.body.append(dialog); dialog.showModal(); Object.values(fields)[0]?.focus();
    }
    function initialize() {
        if (ready) return; ready = true;
        appearance = createThemePreference(host.account().handle, (id, reading) => {
            document.body.dataset.pmTheme = id;
            document.body.style.setProperty('--pm-reading-size', `${reading.fontSize}px`);
            document.body.style.setProperty('--pm-reading-leading', String(reading.lineHeight));
        });
        toolbar = el('header', 'pm-toolbar');
        const identity = el('div', 'pm-identity');
        const identityTop = el('div', 'pm-identity-top');
        identityTop.append(el('span', 'pm-eyebrow', 'PLAYERMODE · 对话'), button('切换主题', showThemes, 'pm-quiet pm-theme-trigger'));
        title = el('h1', 'pm-title'); identity.append(identityTop, title);
        const actions = el('div', 'pm-actions');
        const newChat = button('＋ 新对话', newConversation);
        const browse = button('对话书架', showLibrary, 'pm-quiet');
        exit = button('退出玩家模式', () => showPassword('exit'), 'pm-quiet');
        const account = button('切换账户', switchAccount, 'pm-quiet');
        actions.append(browse, newChat, account, exit); toolbar.append(identity, actions);
        accountLabel = el('span', 'pm-account-label');
        connectionLabel = el('span', 'pm-connection'); connectionLabel.setAttribute('role', 'status');
        identity.append(accountLabel, connectionLabel);
        status = el('div', 'pm-status'); status.setAttribute('role', 'status');
        enter = button('进入玩家模式', () => setMode(true)); enter.classList.add('pm-enter');
        library = createLibrary({ el, button, getContext, getSettings, navigation: { ...navigation, newChat: async avatar => { checkDraft(); await navigation.newChat(avatar); }, openChat: async (avatar, file) => { checkDraft(); await navigation.openChat(avatar, file); } }, onError: notify, onChat: () => { hideLibrary(); updateTitle(); } });
        document.body.append(toolbar, enter, status, library.root);
        const panel = el('section', 'pm-settings');
        settingsButton = button('设置／修改统一退出密码', () => showPassword('setup'));
        panel.append(el('h3', '', 'PlayerMode 0.5.0'), el('p', '', '每个原生账户分别配置退出密码、开放角色与模型/世界书；登录密码由酒馆管理。'), settingsButton, button('开放角色与默认角色', () => { if (!configured) { notify('请先设置退出密码。'); return; } showPassword('roles'); }), button('原生账户管理', () => { const node = document.querySelector('#admin_button'); if (host.account().admin && node) node.click(); else notify('此操作需要原生管理员账户。'); }));
        const settingsHost = document.querySelector(selectors.settings);
        if (settingsHost) settingsHost.append(panel); else console.warn('[PlayerMode] Settings host missing.');
        const value = context.extensionSettings.PlayerMode;
        configured = validSettings(value);
        // Old browser-local credentials and ON/OFF state are never trusted or imported.
        updateTitle(); setMode(configured);
        if (value && !configured) notify('共享密码配置异常，请在扩展设置中恢复；未使用旧浏览器密码。');
        else if (!configured) notify('请先在扩展设置中配置统一退出密码。');
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, () => { updateTitle(); if (active && !currentCard()) showLibrary(); });
        ['GENERATION_STARTED', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'ONLINE_STATUS_CHANGED'].forEach(key => { if (context.eventTypes[key]) context.eventSource.on(context.eventTypes[key], () => setTimeout(updateTitle, 0)); });
        document.addEventListener('keydown', event => {
            if (active && !event.isComposing && event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
                event.preventDefault(); showPassword('exit');
            }
        }, true);
        console.log('[PlayerMode] Initialized 0.5.0');
    }
    context.eventSource.on(context.eventTypes.APP_READY, initialize);
})();
