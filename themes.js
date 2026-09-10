// Appearance only. Never read or write credentials, unlock state or native shared settings.
export const themes = [
    { id: 'midnight', name: '雾紫夜谈', description: '深蓝夜色与雾紫，安静地读完一段长对话。' },
    { id: 'letter', name: '旧信笺', description: '浅色信纸与墨绿文字，像翻开一封等待已久的来信。' },
    { id: 'rain', name: '雨夜书房', description: '青灰雨窗、旧书纸色与暖灯，留一盏灯等故事继续。' },
];
export function createThemePreference(account, apply, getStorage = () => globalThis.localStorage) {
    const key = `PlayerMode.appearance.v1:${encodeURIComponent(account || 'default-user')}`;
    const valid = id => themes.some(theme => theme.id === id);
    let selected = 'midnight';
    const normalize = value => ({
        fontSize: Math.min(22, Math.max(14, Number(value?.fontSize) || 16)),
        lineHeight: Math.min(2.2, Math.max(1.6, Number(value?.lineHeight) || 1.85)),
    });
    let reading = normalize();
    try {
        const saved = getStorage().getItem(key);
        if (valid(saved)) selected = saved;
        else if (saved) {
            const value = JSON.parse(saved);
            if (valid(value?.theme)) { selected = value.theme; reading = normalize(value); }
        }
    } catch { /* Session-only appearance still works. */ }
    apply(selected, reading);
    return {
        get value() { return selected; },
        get reading() { return { ...reading }; },
        preview(id, value = reading) { if (!valid(id)) throw new Error('未知主题'); apply(id, normalize(value)); },
        restore() { apply(selected, reading); },
        choose(id, value = reading) {
            if (!valid(id)) throw new Error('未知主题');
            selected = id; reading = normalize(value); apply(id, reading);
            try { getStorage().setItem(key, JSON.stringify({ theme: id, ...reading })); return true; } catch { return false; }
        },
    };
}
