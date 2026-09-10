import { validCredential } from './security.js';

export const settingsKey = 'PlayerMode';
export function validSettings(value) {
    return value?.version === 1 && validCredential(value.credential)
        && (value.allowedAvatars === undefined || (Array.isArray(value.allowedAvatars) && value.allowedAvatars.every(item => typeof item === 'string')))
        && (value.allowAllCharacters === undefined || typeof value.allowAllCharacters === 'boolean')
        && (value.defaultAvatar === undefined || typeof value.defaultAvatar === 'string');
}

// Only the native settings endpoint is read. No model request or chat data is involved.
export function createSettingsStore(context) {
    async function read() {
        const response = await fetch('/api/settings/get', {
            method: 'POST', headers: context.getRequestHeaders(), body: '{}',
            cache: 'no-store', signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error('无法读取共享设置，请检查服务器连接后重试。');
        const payload = await response.json();
        if (typeof payload.settings !== 'string') throw new Error('服务器未返回账户设置。');
        const settings = JSON.parse(payload.settings);
        const value = settings.extension_settings?.[settingsKey];
        if (value != null && !validSettings(value)) throw new Error('共享密码配置损坏，请由管理员恢复配置。');
        return value ?? null;
    }
    async function save(value) {
        const previous = context.extensionSettings[settingsKey];
        const event = context.eventTypes.SETTINGS_UPDATED;
        let listener, timeout;
        const saved = new Promise(resolve => {
            listener = () => resolve();
            context.eventSource.on(event, listener);
            timeout = setTimeout(resolve, 12000);
        });
        try {
            context.extensionSettings[settingsKey] = value;
            context.saveSettingsDebounced();
            await saved;
            const actual = await read();
            if (JSON.stringify(actual) !== JSON.stringify(value)) throw new Error('共享密码尚未保存成功，请重试。');
            try { localStorage.removeItem('PlayerMode.preferences.v1'); } catch { /* Optional legacy cleanup. */ }
            return actual;
        } catch (error) {
            // Native settings saves have no per-field transaction. Never claim success without readback.
            if (previous === undefined) delete context.extensionSettings[settingsKey];
            else context.extensionSettings[settingsKey] = previous;
            throw error;
        } finally {
            clearTimeout(timeout);
            context.eventSource.removeListener(event, listener);
        }
    }
    return { read, save };
}
