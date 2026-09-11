// Native API boundary regressions. Fixtures never access a real account or server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { allowedCharacters, createNavigation } from './navigation.js';

const hostSource = fs.readFileSync(new URL('./host.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export const host', 'const host');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function fixture() {
    const state = {
        cards: [{ avatar: 'one.png', name: 'One', chat: 'one-old' }, { avatar: 'two.png', name: 'Two', chat: 'two-old' }],
        selected: 0, groupId: null, groupChat: 'group-old', generating: false,
        settings: { allowAllCharacters: true }, saves: [], selections: [], opens: [], creates: [], confirms: [],
        confirm: async () => 1,
    };
    state.save = async () => {};
    state.select = async id => { state.selected = id; state.groupId = null; };
    state.open = async file => { state.cards[state.selected].chat = file; };
    state.create = async () => { state.cards[state.selected].chat = `created-${state.creates.length}`; };
    const getContext = () => ({
        characters: state.cards, characterId: state.selected, groupId: state.groupId,
        chatId: state.groupId ? state.groupChat : state.cards[state.selected]?.chat,
        getRequestHeaders: () => ({}),
        async saveChat() { state.saves.push(state.groupId || state.cards[state.selected]?.avatar); await state.save(); },
        async selectCharacterById(id, options) { state.selections.push({ id, options }); await state.select(id); },
        async openCharacterChat(file) { state.opens.push(file); await state.open(file); },
    });
    const runtime = vm.createContext({
        isGenerating: () => state.generating,
        accountsEnabled: true, currentUser: { name: 'Fixture', handle: 'fixture' }, POPUP_RESULT: { AFFIRMATIVE: 1 },
        Popup: { show: { confirm: async (...args) => { state.confirms.push(args); return await state.confirm(...args); } } },
        doNewChat: async options => { state.creates.push(options); await state.create(options); },
    });
    vm.runInContext(`${hostSource}\nglobalThis.nativeHost = host;`, runtime);
    const navigation = createNavigation(getContext, () => state.generating, () => state.settings, (...args) => runtime.nativeHost.newChat(...args));
    return { state, navigation, host: runtime.nativeHost };
}

test('new chat holds the guard through native confirmation and creation', async () => {
    const { state, navigation } = fixture();
    const entered = deferred(), answer = deferred(), created = deferred(), finish = deferred();
    state.confirm = async () => { entered.resolve(); return await answer.promise; };
    state.create = async () => { created.resolve(); await finish.promise; state.cards[state.selected].chat = 'new-session'; };
    const running = navigation.newChat('two.png');
    await entered.promise;
    await assert.rejects(navigation.openChat('one.png', 'history'), /等待/);
    assert.equal(state.creates.length, 0);
    answer.resolve(1);
    await created.promise;
    assert.throws(navigation.guard, /等待/);
    finish.resolve();
    assert.equal(await running, true);
    assert.equal(state.creates[0].deleteCurrentChat, false);
    assert.equal(state.saves[0], 'one.png');
    assert.equal(state.saves[1], 'two.png');
    assert.equal(state.cards[state.selected].chat, 'new-session');
    assert.doesNotThrow(navigation.guard);
});

test('cancel returns false without creating or opening a new chat', async () => {
    const { state, navigation } = fixture();
    state.confirm = async () => 0;
    assert.equal(await navigation.newChat('one.png'), false);
    assert.equal(state.creates.length, 0);
    assert.equal(state.opens.length, 0);
    assert.equal(state.cards[0].chat, 'one-old');
    assert.doesNotThrow(navigation.guard);
});

test('native dialog exposes explicit create/cancel and no delete checkbox', async () => {
    const { state, navigation } = fixture();
    await navigation.newChat('one.png');
    const [header, text, options] = state.confirms[0];
    assert.match(header, /新建对话/);
    assert.match(text, /保留在历史/);
    assert.equal(options.okButton, '新建对话');
    assert.equal(options.cancelButton, '取消');
    assert(!text.includes('<input'));
});

test('generation beginning during confirmation aborts before creation', async () => {
    const { state, navigation } = fixture();
    state.confirm = async () => { state.generating = true; return 1; };
    await assert.rejects(navigation.newChat('one.png'), /等待当前回复/);
    assert.equal(state.creates.length, 0);
    state.generating = false;
    assert.doesNotThrow(navigation.guard);
});

test('a different selected role after confirmation cannot receive the new chat', async () => {
    const { state, navigation } = fixture();
    state.confirm = async () => { state.selected = 1; return 1; };
    await assert.rejects(navigation.newChat('one.png'), /暂时无法/);
    assert.equal(state.creates.length, 0);
});

test('a changed session during confirmation aborts before creation', async () => {
    const { state, navigation } = fixture();
    state.confirm = async () => { state.cards[0].chat = 'other-session'; return 1; };
    await assert.rejects(navigation.newChat('one.png'), /当前对话已变化/);
    assert.equal(state.creates.length, 0);
});

test('a native selection that silently refuses to leave a group is rejected', async () => {
    const { state, navigation } = fixture();
    state.groupId = 'group';
    state.select = async () => {};
    await assert.rejects(navigation.newChat('one.png'), /暂时无法/);
    assert.deepEqual(state.saves, ['group']);
    assert.equal(state.confirms.length, 0);
    assert.equal(state.creates.length, 0);
});

test('a group is saved with the native conditional API before selecting a role', async () => {
    const { state, navigation } = fixture();
    state.groupId = 'group';
    assert.equal(await navigation.openChat('two.png', 'past-session'), true);
    assert.deepEqual(state.saves, ['group']);
    assert.equal(state.groupId, null);
    assert.equal(state.cards[state.selected].avatar, 'two.png');
    assert.deepEqual(state.opens, ['past-session']);
});

test('card IDs are resolved again after a save reorders native characters', async () => {
    const { state, navigation } = fixture();
    state.save = async () => { state.cards.reverse(); state.selected = 1; };
    await navigation.openChat('two.png', 'past-session');
    assert.equal(state.selections[0].id, 0);
    assert.equal(state.cards[state.selected].avatar, 'two.png');
});

test('external chat changes during save stop the switch', async () => {
    const { state, navigation } = fixture();
    state.save = async () => { state.cards[0].chat = 'different-session'; };
    await assert.rejects(navigation.openChat('two.png', 'past-session'), /当前对话已变化/);
    assert.equal(state.selections.length, 0);
});

test('native opening must finish at the requested role and session', async () => {
    const { state, navigation } = fixture();
    state.open = async () => {};
    await assert.rejects(navigation.openChat('one.png', 'past-session'), /未能打开/);
    state.open = async () => { state.selected = 1; };
    await assert.rejects(navigation.openChat('one.png', 'past-session'), /暂时无法/);
});

test('native new-chat no-op or final role mismatch cannot report success', async () => {
    const { state, navigation } = fixture();
    state.create = async () => {};
    await assert.rejects(navigation.newChat('one.png'), /未能新建/);
    state.create = async () => { state.selected = 1; };
    await assert.rejects(navigation.newChat('one.png'), /暂时无法/);
});

test('native async rejection propagates and releases pending navigation', async () => {
    const { state, navigation } = fixture();
    state.create = async () => { throw new Error('native create failure'); };
    await assert.rejects(navigation.newChat('one.png'), /native create failure/);
    assert.doesNotThrow(navigation.guard);
});

test('generation triggered by successful chat load does not turn success into an error', async () => {
    const { state, navigation } = fixture();
    state.open = async file => { state.cards[0].chat = file; state.generating = true; };
    assert.equal(await navigation.openChat('one.png', 'past-session'), true);
});

test('invalid history file names never fall through into new-chat creation', async () => {
    const { state, navigation } = fixture();
    for (const file of [null, undefined, '', '  ', 12]) {
        await assert.rejects(navigation.openChat('one.png', file), /文件名/);
    }
    assert.equal(state.saves.length, 0);
    assert.equal(state.creates.length, 0);
});

test('null character/history entries are ignored without breaking valid records', async () => {
    assert.deepEqual(allowedCharacters(null, null), []);
    assert.deepEqual(allowedCharacters({ characters: {} }, {}), []);
    assert.deepEqual(allowedCharacters({ characters: [null, { avatar: 'one.png' }] }, { allowAllCharacters: true }), [{ id: 1, avatar: 'one.png', name: '未命名角色' }]);
    assert.deepEqual(allowedCharacters({ characters: [{ avatar: 'one.png' }] }, { allowedAvatars: 'one.png' }), []);
    const { navigation } = fixture();
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async (url, options) => {
            assert.equal(url, '/api/chats/search');
            assert.deepEqual(JSON.parse(options.body), { query: '', avatar_url: 'one.png', group_id: null });
            return { ok: true, json: async () => [null, false, {}, { file_name: 'older', last_mes: 100 }, { file_name: 'newer', last_mes: 200 }] };
        };
        assert.deepEqual((await navigation.history('one.png')).map(row => row.file_name), ['newer', 'older']);
    } finally { globalThis.fetch = originalFetch; }
});
