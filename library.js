import { allowedCharacters } from './navigation.js';

export function createLibrary({ el, button, getContext, getSettings, navigation, onError, onChat }) {
    const root = el('main', 'pm-library'); root.hidden = true;
    let request, page = 0, rows = [], chosen = null, busy = false;
    const pageSize = 12;
    function clear() { request?.abort(); request = null; chosen = null; root.replaceChildren(); root.scrollTop = 0; }
    function heading(name, description) {
        const node = el('div', 'pm-library-heading');
        const title = el('h2', '', name); title.tabIndex = -1;
        node.append(el('span', 'pm-eyebrow', 'YOUR STORIES · 故事之间'), title, el('p', 'pm-muted', description));
        root.append(node); return title;
    }
    async function act(task) {
        if (busy) return;
        busy = true; root.setAttribute('aria-busy', 'true');
        const controls = [...root.querySelectorAll('button')]; controls.forEach(node => { node.disabled = true; });
        try { await task(); onChat(); }
        catch (error) { onError(error.message); }
        finally { busy = false; root.removeAttribute('aria-busy'); controls.forEach(node => { node.disabled = false; }); }
    }
    function show() {
        if (busy) return;
        clear(); chosen = null;
        const cards = allowedCharacters(getContext(), getSettings());
        heading('选择一段故事', '回到熟悉的人身边，或从新的第一句话开始。').focus();
        if (!cards.length) {
            root.append(el('p', 'pm-empty', '这里还没有开放的角色。请让管理员在 PlayerMode 设置中选择角色卡和默认角色。'));
            return;
        }
        const grid = el('div', 'pm-character-grid');
        cards.forEach(card => {
            const tile = button('', () => showHistory(card.avatar), 'pm-character-card');
            const cover = el('span', 'pm-character-cover'); cover.setAttribute('aria-hidden', 'true');
            cover.append(el('span', 'pm-cover-initial', [...card.name][0]));
            const image = el('img', 'pm-character-art'); image.alt = ''; image.loading = 'lazy';
            image.src = `/thumbnail?type=avatar&file=${encodeURIComponent(card.avatar)}`;
            image.addEventListener('error', () => { image.hidden = true; });
            const caption = el('span', 'pm-character-caption');
            caption.append(el('span', 'pm-eyebrow', getSettings()?.defaultAvatar === card.avatar ? '默认故事' : '角色故事'), el('strong', '', card.name), el('span', 'pm-muted', '查看对话 →'));
            cover.append(image); tile.append(cover, caption); grid.append(tile);
        });
        root.append(grid);
    }
    async function showHistory(avatar) {
        if (busy) return;
        clear(); chosen = avatar; page = 0; rows = [];
        const card = allowedCharacters(getContext(), getSettings()).find(card => card.avatar === avatar);
        if (!card) { show(); return; }
        root.append(button('← 全部角色', show, 'pm-quiet'));
        heading(card.name, '继续已有对话，或为这个角色开启新的一页。').focus();
        root.append(button('＋ 为此角色新建对话', () => act(() => navigation.newChat(avatar)), 'pm-primary'));
        const list = el('div', 'pm-history-list'); const message = el('p', 'pm-muted', '正在读取你的对话…');
        message.setAttribute('role', 'status'); list.append(message); root.append(list);
        const controller = new AbortController(); request = controller;
        const timer = setTimeout(() => controller.abort('timeout'), 12000);
        function render() {
            list.replaceChildren();
            if (!rows.length) { list.append(el('p', 'pm-empty', '还没有对话。上方的“新建对话”会使用这个角色。')); return; }
            rows.slice(0, (page + 1) * pageSize).forEach(row => {
                const item = button('', () => act(() => navigation.openChat(avatar, row.file_name)), 'pm-history-item');
                item.append(el('strong', '', row.file_name), el('span', 'pm-muted pm-preview', row.preview_message || '暂无预览'), el('span', 'pm-history-meta', `${row.message_count ?? 0} 条消息`));
                list.append(item);
            });
            if (rows.length > (page + 1) * pageSize) list.append(button('加载更多对话', () => { page++; render(); }));
        }
        try {
            const received = await navigation.history(avatar, controller.signal);
            if (request !== controller || chosen !== avatar) return;
            rows = received; render();
        } catch (error) {
            if (request !== controller) return;
            list.replaceChildren(el('p', 'pm-error', controller.signal.reason === 'timeout' ? '读取超时，请重试。' : error.message), button('重试', () => showHistory(avatar)));
        } finally { clearTimeout(timer); }
    }
    return { root, show, cancel: () => { request?.abort(); request = null; }, showHistory };
}
