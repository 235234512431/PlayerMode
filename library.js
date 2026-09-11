import { allowedCharacters } from './navigation.js';
import { sortHistory, historyTimeLabel, messageCount } from './history.js';
import { storyArt } from './motifs.js';

export function createLibrary({ el, button, getContext, getSettings, getAccount = () => '', navigation, onError, onChat, onResume }) {
    const root = el('main', 'pm-library'); root.hidden = true;
    let request, page = 0, rows = [], chosen = null, busy = false, query = '', favoritesOnly = false;
    const pageSize = 12;
    const storageKey = `PlayerMode.bookmarks.v1:${encodeURIComponent(getAccount() || 'default-user')}`;
    let favorites = new Set();
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(saved)) favorites = new Set(saved.filter(value => typeof value === 'string'));
    } catch { /* Collection remains available within this page. */ }
    const historyQueries = new Map();
    const historyOrders = new Map();
    function searchControl(id, name, placeholder, value, onChange) {
        const node = el('div', 'pm-shelf-search'); node.append(storyArt('search'));
        const label = el('label', 'pm-sr-only', name); label.htmlFor = id;
        const input = el('input'); input.id = id; input.type = 'search'; input.placeholder = placeholder;
        input.value = value; input.autocomplete = 'off';
        let composing = false;
        const clearSearch = button('清除', () => {
            if (busy) return;
            input.value = ''; composing = false; update(); input.focus();
        }, 'pm-search-clear');
        clearSearch.setAttribute('aria-label', `清除${name}`);
        clearSearch.hidden = !value;
        function update() {
            clearSearch.hidden = !input.value;
            if (!composing && !busy) onChange(input.value);
        }
        input.addEventListener('compositionstart', () => { composing = true; });
        input.addEventListener('compositionend', () => { composing = false; update(); });
        input.addEventListener('input', update);
        node.append(label, input, clearSearch);
        return node;
    }
    function clear() { request?.abort(); request = null; chosen = null; root.replaceChildren(); root.scrollTop = 0; }
    function heading(name, description, illustration = false) {
        const node = el('div', `pm-library-heading${illustration ? ' pm-library-welcome' : ''}`);
        const copy = el('div', 'pm-welcome-copy');
        const title = el('h2', '', name); title.tabIndex = -1;
        let focusTitle = title;
        copy.append(el('span', 'pm-eyebrow', '故事之间 · STORY ROOM'), title, el('p', 'pm-muted', description));
        node.append(copy);
        if (illustration) {
            const campusCopy = el('div', 'pm-campus-copy');
            const campusTitle = el('h2', '', '窗的这一边，故事还在。'); campusTitle.tabIndex = -1;
            if (document.body.dataset.pmTheme === 'fugou') focusTitle = campusTitle;
            campusCopy.append(el('span', 'pm-eyebrow', '扶沟高中 · 窗世界'), campusTitle, el('p', 'pm-muted', '把未说完的话，留在下一页。'));
            copy.prepend(campusCopy);
            node.append(storyArt('room'), storyArt('classroom'));
        }
        root.append(node); return { title: focusTitle, copy };
    }
    async function act(task) {
        if (busy) return;
        busy = true; root.setAttribute('aria-busy', 'true');
        const controls = [...root.querySelectorAll('button, input')]; controls.forEach(node => { node.disabled = true; });
        try { if (await task() !== false) onChat(); }
        catch (error) { onError(error.message); }
        finally { busy = false; root.removeAttribute('aria-busy'); controls.forEach(node => { node.disabled = false; }); }
    }
    function show() {
        if (busy) return;
        clear();
        const cards = allowedCharacters(getContext(), getSettings());
        const welcome = heading('留一页，给下一次相遇。', '熟悉的人、未完的对话，都在这里。', true);
        const current = getContext();
        const activeCard = !current.groupId && cards.find(card => String(card.id) === String(current.characterId));
        const defaultCard = cards.find(card => card.avatar === getSettings()?.defaultAvatar);
        if (activeCard && onResume) {
            const resume = button(`回到当前对话 · ${activeCard.name}`, onResume, 'pm-resume');
            resume.prepend(storyArt('arrow')); welcome.copy.append(resume);
        } else if (defaultCard) {
            const start = button(`打开默认故事 · ${defaultCard.name}`, () => showHistory(defaultCard.avatar), 'pm-resume');
            start.prepend(storyArt('arrow')); welcome.copy.append(start);
        }
        welcome.title.focus();
        if (!cards.length) {
            root.append(el('p', 'pm-empty', '书架还空着。请让管理员在 PlayerMode 设置中开放角色并选择默认角色。'));
            return;
        }
        const tools = el('div', 'pm-shelf-tools');
        const tabs = el('div', 'pm-collection-filters'); tabs.setAttribute('aria-label', '角色范围');
        const all = button(`全部角色 · ${cards.length}`, () => { favoritesOnly = false; render(); }, 'pm-collection-filter');
        const pinned = button('我的收藏', () => { favoritesOnly = true; render(); }, 'pm-collection-filter');
        tabs.append(all, pinned);
        const search = searchControl('pm-role-search', '角色搜索', '寻找一位角色', query, value => { query = value; render(); });
        tools.append(tabs, search); root.append(tools);
        const result = el('p', 'pm-shelf-count'); result.setAttribute('role', 'status'); root.append(result);
        const grid = el('div', 'pm-character-grid'); root.append(grid);
        function render() {
            const needle = query.trim().toLocaleLowerCase('zh-CN');
            const matching = cards.filter(card => (!favoritesOnly || favorites.has(card.avatar)) && (!needle || card.name.toLocaleLowerCase('zh-CN').includes(needle)));
            all.setAttribute('aria-pressed', String(!favoritesOnly)); pinned.setAttribute('aria-pressed', String(favoritesOnly));
            pinned.textContent = `我的收藏 · ${cards.filter(card => favorites.has(card.avatar)).length}`;
            result.textContent = needle ? `找到 ${matching.length} 位角色` : `${matching.length} 段故事，等你翻开`;
            grid.replaceChildren();
            if (!matching.length) {
                grid.append(el('p', 'pm-empty', needle ? '没有找到这位角色。换个名字，或清除搜索再看看。' : '还没有收藏。点击角色封面上的书签，下次更快找到。'));
                return;
            }
            matching.forEach(card => {
                const article = el('article', 'pm-story-volume');
                const tile = button('', () => showHistory(card.avatar), 'pm-character-card');
                tile.setAttribute('aria-label', `查看${card.name}的对话`);
                const cover = el('span', 'pm-character-cover'); cover.setAttribute('aria-hidden', 'true');
                cover.append(el('span', 'pm-cover-initial', [...card.name][0]));
                const image = el('img', 'pm-character-art'); image.alt = ''; image.loading = 'lazy';
                image.src = `/thumbnail?type=avatar&file=${encodeURIComponent(card.avatar)}`;
                image.addEventListener('error', () => { image.hidden = true; }); cover.append(image);
                const caption = el('span', 'pm-character-caption');
                caption.append(el('span', 'pm-eyebrow', defaultCard?.avatar === card.avatar ? '默认故事' : '角色故事'), el('strong', '', card.name));
                const action = el('span', 'pm-card-action', '翻开对话'); action.append(storyArt('arrow')); caption.append(action);
                tile.append(cover, caption);
                const favorite = button('', () => {
                    if (favorites.has(card.avatar)) favorites.delete(card.avatar); else favorites.add(card.avatar);
                    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); }
                    catch { onError('收藏已在当前页面更新；浏览器无法保存，刷新后可能丢失。'); }
                    render();
                    const target = [...grid.querySelectorAll('.pm-bookmark')].find(node => node.dataset.avatar === card.avatar);
                    (target || pinned).focus();
                }, 'pm-bookmark');
                favorite.dataset.avatar = card.avatar;
                favorite.setAttribute('aria-label', `${favorites.has(card.avatar) ? '取消收藏' : '收藏'}${card.name}`);
                favorite.setAttribute('aria-pressed', String(favorites.has(card.avatar)));
                favorite.title = favorites.has(card.avatar) ? '取消收藏' : '收藏角色'; favorite.append(storyArt('bookmark'));
                article.append(tile, favorite); grid.append(article);
            });
        }
        render();
    }
    async function showHistory(avatar) {
        if (busy) return;
        clear(); chosen = avatar; page = 0; rows = [];
        const card = allowedCharacters(getContext(), getSettings()).find(card => card.avatar === avatar);
        if (!card) { show(); return; }
        root.append(button('← 返回书架', show, 'pm-quiet'));
        const header = heading(card.name, '对话会留下痕迹。选一段继续，或另起一页。'); header.title.focus();
        const newChat = button('为此角色新建对话', () => act(() => navigation.newChat(avatar)), 'pm-primary');
        header.copy.append(newChat);
        let historyQuery = historyQueries.get(avatar) || '';
        const tools = el('div', 'pm-history-tools'); tools.hidden = true;
        const search = searchControl('pm-history-search', '对话搜索', '搜索对话名或预览文字', historyQuery, value => {
            historyQuery = value; historyQueries.set(avatar, value); page = 0; render();
        });
        let order = historyOrders.get(avatar) || 'recent';
        const sorting = el('div', 'pm-collection-filters pm-history-order');
        sorting.setAttribute('role', 'group'); sorting.setAttribute('aria-label', '对话排序');
        const sortButtons = [];
        for (const [value, label] of [['recent', '最近对话'], ['oldest', '最早对话'], ['longest', '消息最多']]) {
            const control = button(label, () => {
                if (busy) return;
                order = value; historyOrders.set(avatar, value); page = 0; render();
            }, 'pm-collection-filter');
            sortButtons.push({ value, control }); sorting.append(control);
        }
        const count = el('p', 'pm-shelf-count'); count.setAttribute('role', 'status');
        const hint = el('p', 'pm-muted pm-history-hint', '只搜索本角色的对话名与预览，不搜索完整聊天；时间按当前设备时区显示。');
        hint.id = 'pm-history-search-hint'; search.querySelectorAll('input')[0].setAttribute('aria-describedby', hint.id);
        tools.append(search, sorting, count, hint); root.append(tools);
        const list = el('div', 'pm-history-list'); const message = el('p', 'pm-muted', '正在读取你的对话…');
        message.setAttribute('role', 'status'); list.append(message); root.append(list);
        const controller = new AbortController(); request = controller;
        const timer = setTimeout(() => controller.abort('timeout'), 12000);
        function render() {
            list.replaceChildren();
            if (!rows.length) { list.append(el('p', 'pm-empty', '故事还没开始。点击上方“新建对话”，写下与这个角色的第一句话。')); return; }
            const needle = historyQuery.trim().toLocaleLowerCase('zh-CN');
            sortButtons.forEach(({ value, control }) => control.setAttribute('aria-pressed', String(value === order)));
            const matching = sortHistory(rows.filter(row => !needle || [row.file_name, row.preview_message].some(value => typeof value === 'string' && value.toLocaleLowerCase('zh-CN').includes(needle))), order);
            const visibleCount = Math.min(matching.length, (page + 1) * pageSize);
            count.textContent = needle ? `找到 ${matching.length} 段对话 · 已显示 ${visibleCount} 段` : `共 ${rows.length} 段对话 · 已显示 ${visibleCount} 段`;
            if (!matching.length) { list.append(el('p', 'pm-empty', '这一页暂时没有线索。换个关键词，或清除搜索再看看。')); return; }
            matching.slice(0, (page + 1) * pageSize).forEach(row => {
                const item = button('', () => act(() => navigation.openChat(avatar, row.file_name)), 'pm-history-item');
                const copy = el('span', 'pm-history-copy');
                copy.append(el('strong', '', row.file_name), el('span', 'pm-muted pm-preview', row.preview_message || '暂无预览'), el('span', 'pm-history-meta', `${messageCount(row.message_count)} 条消息 · ${historyTimeLabel(row.last_mes)}`));
                item.append(storyArt('bookmark'), copy, storyArt('arrow')); list.append(item);
            });
            if (matching.length > (page + 1) * pageSize) list.append(button('加载更多对话', () => { page++; render(); }));
        }
        try {
            const received = await navigation.history(avatar, controller.signal);
            if (request !== controller || chosen !== avatar) return;
            rows = received; tools.hidden = !rows.length; render();
        } catch (error) {
            if (request !== controller) return;
            list.replaceChildren(el('p', 'pm-error', controller.signal.reason === 'timeout' ? '读取超时，请重试。' : error.message), button('重试', () => showHistory(avatar)));
        } finally { clearTimeout(timer); }
    }
    return { root, show, cancel: () => { request?.abort(); request = null; }, showHistory };
}
