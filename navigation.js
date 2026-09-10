// Native account/session and chat APIs own all persistence. Avatar filenames are stable card keys.
export function allowedCharacters(context, settings) {
    const allowed = settings?.allowedAvatars ?? [];
    return (context.characters ?? []).map((card, id) => ({ id, avatar: card.avatar, name: card.name || '未命名角色' }))
        .filter(card => typeof card.avatar === 'string' && (settings?.allowAllCharacters === true || allowed.includes(card.avatar)));
}

export function createNavigation(getContext, isGenerating, getSettings, nativeNewChat) {
    let pending = false;
    function guard() {
        if (pending || isGenerating()) throw new Error('请先等待当前回复和操作完成，再切换对话。');
    }
    function resolve(avatar) {
        const card = allowedCharacters(getContext(), getSettings()).find(card => card.avatar === avatar);
        if (!card) throw new Error('此角色未开放或已移除，请联系管理员。');
        return card;
    }
    async function select(avatar) {
        let card = resolve(avatar);
        await getContext().saveChat();
        if (isGenerating()) throw new Error('回复生成中，无法切换角色。');
        // Resolve again after await: IDs can change when native cards are added or removed.
        card = resolve(avatar);
        await getContext().selectCharacterById(card.id, { switchMenu: false });
        const current = getContext();
        if (current.groupId || current.characters[current.characterId]?.avatar !== avatar) {
            throw new Error('原生界面暂时无法切换角色，请稍后重试。');
        }
        return card;
    }
    async function run(avatar, file) {
        guard(); pending = true;
        try {
            await select(avatar);
            if (file != null) await getContext().openCharacterChat(file);
            else nativeNewChat(); // Always after verified selection; never falls back to assistant.
        } finally { pending = false; }
    }
    async function history(avatar, signal) {
        resolve(avatar);
        const response = await fetch('/api/chats/search', {
            method: 'POST', headers: getContext().getRequestHeaders(),
            body: JSON.stringify({ query: '', avatar_url: avatar, group_id: null }),
            cache: 'no-store', signal,
        });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? '登录已失效，请重新登录。' : '对话列表加载失败，请重试。');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('服务器返回的对话列表格式不正确。');
        const timestamp = value => {
            if (typeof value === 'number') return value;
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : Date.parse(String(value)) || 0;
        };
        return data.filter(row => typeof row.file_name === 'string' && row.file_name)
            .sort((a, b) => timestamp(b.last_mes) - timestamp(a.last_mes));
    }
    return { guard, history, newChat: avatar => run(avatar, null), openChat: (avatar, file) => run(avatar, file) };
}
