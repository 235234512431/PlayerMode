// ST 1.18.0 exports. No session cookies, credentials or alternate backends are introduced.
import { isGenerating } from '/script.js';
import { accountsEnabled, currentUser } from '/scripts/user.js';
export const host = {
    isGenerating,
    account: () => ({ enabled: accountsEnabled, name: currentUser?.name || currentUser?.handle || '默认账户', handle: currentUser?.handle, admin: Boolean(currentUser?.admin) }),
};
