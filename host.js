// ST 1.18.0 exports. No session cookies, credentials or alternate backends are introduced.
import { doNewChat, isGenerating } from '/script.js';
import { accountsEnabled, currentUser } from '/scripts/user.js';
import { Popup, POPUP_RESULT } from '/scripts/popup.js';
export const host = {
    isGenerating,
    async newChat(beforeCreate = async () => {}) {
        if (isGenerating()) throw new Error('请先等待当前回复完成，再新建对话。');
        const result = await Popup.show.confirm('为此角色新建对话？', '当前对话会保留在历史记录中，新对话将从角色开场白开始。', {
            okButton: '新建对话', cancelButton: '取消',
        });
        if (result !== POPUP_RESULT.AFFIRMATIVE) return false;
        if (isGenerating()) throw new Error('请先等待当前回复完成，再新建对话。');
        await beforeCreate();
        if (isGenerating()) throw new Error('请先等待当前回复完成，再新建对话。');
        await doNewChat({ deleteCurrentChat: false });
        return true;
    },
    account: () => ({ enabled: accountsEnabled, name: currentUser?.name || currentUser?.handle || '默认账户', handle: currentUser?.handle, admin: Boolean(currentUser?.admin) }),
};
