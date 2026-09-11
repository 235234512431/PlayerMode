// Dependency-free isolated tests; no real server, password or user settings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createCredential, verifyPassword } from './security.js';
import { createSettingsStore, validSettings } from './settings.js';
import { createNavigation, allowedCharacters } from './navigation.js';
import { themes, createThemePreference } from './themes.js';
const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const old = {version:1,allowAllCharacters:true,defaultAvatar:'test.png', credential:await createCredential('fixture-old')};
const fresh = {version:1,allowAllCharacters:true,defaultAvatar:'test.png', credential:await createCredential('fixture-new')};
let server=structuredClone(old), offline=false, rejectSave=false, cleanup=0;
globalThis.localStorage={removeItem(key){assert.equal(key,'PlayerMode.preferences.v1');cleanup++}};
globalThis.fetch=async()=>{
 if(offline)throw Error('offline');
 return {ok:true,json:async()=>({settings:JSON.stringify({extension_settings:{PlayerMode:server}})})};
};
function boot(config=server) {
 const nodes=[], classes=new Set(), listeners=new Map();let nativeClicks=0, key;
 const document={activeElement:null};
 class Element {
  constructor(tag){this.tag=tag;this.children=[];this.style={setProperty(){}};this.dataset={};this.events={};this.value='';this.isConnected=true;this.classList={add(){}};nodes.push(this)}
  append(...children){this.children.push(...children)}
  querySelector(){return null} replaceChildren(...children){this.children=children}
  addEventListener(n,f){this.events[n]=f}setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}
  focus(){document.activeElement=this}showModal(){}close(){}remove(){this.removed=true;this.isConnected=false}
  click(){return this.events.click?.()}
 }
 const body=new Element('body');body.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)};
 document.body=body;document.createElement=t=>new Element(t);
 document.querySelector=s=>s==='#option_start_new_chat'?{click(){nativeClicks++}}:body;
 document.addEventListener=(n,f)=>{key=f};
 const context={characters:[{name:'Test',avatar:'test.png'}],characterId:0,saveChat:async()=>{},selectCharacterById:async()=>{},openCharacterChat:async()=>{},name2:'Test',getRequestHeaders:()=>({}),extensionSettings:config?{PlayerMode:structuredClone(config)}:{},eventTypes:{APP_READY:'ready',SETTINGS_UPDATED:'saved',CHAT_CHANGED:'chat'},eventSource:{on(n,f){if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(f);if(n==='ready')f()},removeListener(n,f){listeners.get(n)?.delete(f)}},saveSettingsDebounced(){if(!rejectSave)server=structuredClone(context.extensionSettings.PlayerMode);listeners.get('saved')?.forEach(f=>f())}};
 const instance = vm.createContext({document,console:{log(){},warn(){}},crypto:globalThis.crypto,createCredential,verifyPassword,createSettingsStore,validSettings,createNavigation,allowedCharacters,themes,createThemePreference,host:{newChat:async beforeCreate=>{await beforeCreate();nativeClicks++;return true},isGenerating:()=>false,account:()=>({enabled:true,name:'fixture',admin:true})},createLibrary:({el})=>({root:el('main'),show(){},cancel(){}}),setTimeout:()=>0,clearTimeout(){},SillyTavern:{getContext:()=>context}});
 vm.runInContext(source,instance);
 return {nodes,classes,context,get nativeClicks(){return nativeClicks},
 button(text){return nodes.findLast(n=>n.tag==='button'&&n.textContent===text).click()},
 field(id,value){nodes.findLast(n=>n.id===id).value=value},
 async submit(){await nodes.findLast(n=>n.tag==='form').events.submit({preventDefault(){}})},
 cancel(){nodes.findLast(n=>n.tag==='dialog').events.cancel({preventDefault(){}})},
 key(){key({ctrlKey:true,shiftKey:true,code:'KeyP',preventDefault(){}})}};
}
let app=boot();assert(app.classes.has('playermode-active'));
app.button('退出玩家模式');app.field('pm-current','wrong');await app.submit();assert(app.classes.has('playermode-active'));assert.match(app.nodes.findLast(n=>n.id==='pm-error').textContent,/不正确/);
offline=true;app.field('pm-current','fixture-old');await app.submit();assert(app.classes.has('playermode-active'));offline=false;
server=fresh;await app.submit();assert(app.classes.has('playermode-active')); // Re-read rejects stale password.
app.field('pm-current','fixture-new');await app.submit();assert(!app.classes.has('playermode-active'));
assert.equal(server,fresh);assert(boot().classes.has('playermode-active')); // Unlock does not persist OFF.
app.button('进入玩家模式');app.key();app.cancel();assert(app.classes.has('playermode-active'));
await app.button('＋ 新对话');assert.equal(app.nativeClicks,1);
app.button('退出玩家模式');app.field('pm-current','fixture-new');await app.submit();
app.button('设置／修改统一退出密码');app.field('pm-current','wrong');app.field('pm-password','changed-fixture');app.field('pm-confirm','changed-fixture');await app.submit();assert.equal(server,fresh);
app.field('pm-current','fixture-new');rejectSave=true;await app.submit();assert(!app.classes.has('playermode-active'));assert.equal(app.nodes.findLast(n=>n.id==='pm-password').value,'changed-fixture');assert.equal(cleanup,0);
rejectSave=false;await app.submit();assert(app.classes.has('playermode-active'));assert(await verifyPassword('changed-fixture',server.credential));assert.equal(cleanup,1);
server=null;app=boot(null);assert(!app.classes.has('playermode-active'));app.button('设置／修改统一退出密码');app.field('pm-password','first-fixture');app.field('pm-confirm','first-fixture');await app.submit();assert(app.classes.has('playermode-active'));assert(boot().classes.has('playermode-active'));
assert(!source.includes('getItem('));assert(!source.includes('playermode=0'));assert(!source.includes('window.alert'));
console.log('PASS: shared setup, fresh visitor, latest password, wrong password, offline, save/readback failure, retry, old-state ignored, temporary unlock, reload lock, change-password gate, keyboard/cancel, native new-chat forwarding.');
// Navigation safety: native ownership, selected-role verification, failures, overlap and session scoping.
let generating=false, selected=0, canSelect=true, saves=0, newChats=0, opened=[], deferred;
const cards=[{name:'One',avatar:'one.png'},{name:'Two',avatar:'two.png'}];
let roleSettings={allowAllCharacters:true,defaultAvatar:'two.png'};
const navContext={characters:cards,get characterId(){return selected},getRequestHeaders:()=>({}),saveChat:async()=>{saves++;if(deferred)await deferred},selectCharacterById:async id=>{if(canSelect)selected=id},openCharacterChat:async file=>opened.push([cards[selected].avatar,file])};
const nav=createNavigation(()=>navContext,()=>generating,()=>roleSettings,()=>newChats++);
await nav.newChat('two.png');assert.equal(selected,1);assert.equal(newChats,1);
await nav.openChat('one.png','history-without-suffix');assert.deepEqual(opened,[['one.png','history-without-suffix']]);
canSelect=false;await assert.rejects(nav.newChat('two.png'),/暂时无法/);assert.equal(newChats,1);canSelect=true;
generating=true;await assert.rejects(nav.newChat('two.png'),/等待/);assert.equal(newChats,1);generating=false;
let finish;deferred=new Promise(resolve=>finish=resolve);const underway=nav.newChat('two.png');await assert.rejects(nav.newChat('one.png'),/等待/);finish();await underway;deferred=null;
roleSettings={allowedAvatars:['one.png'],defaultAvatar:'one.png'};await assert.rejects(nav.newChat('two.png'),/未开放/);
assert.deepEqual(allowedCharacters(navContext,roleSettings).map(c=>c.avatar),['one.png']);
assert(!validSettings({...old,allowedAvatars:'not-an-array'}));
let session='account-a',requests=[];
globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>[{file_name:session+'-private-chat',message_count:2}]}};
assert.equal((await nav.history('one.png'))[0].file_name,'account-a-private-chat');session='account-b';assert.equal((await nav.history('one.png'))[0].file_name,'account-b-private-chat');
assert(requests.every(r=>r.avatar_url==='one.png'&&!('user' in r)&&!('account' in r)));
globalThis.fetch=async()=>({ok:false,status:401});await assert.rejects(nav.history('one.png'),/登录已失效/);
globalThis.fetch=async()=>({ok:true,json:async()=>({})});await assert.rejects(nav.history('one.png'),/格式/);
globalThis.fetch=async()=>{throw Error('offline')};await assert.rejects(nav.history('one.png'),/offline/);
assert(saves>=4);assert.equal(newChats,2);
console.log('PASS: allowed roles, explicit default target, verified native selection, history load, generation guard, duplicate guard, expired session, malformed history, offline, native account-scoped requests.');
// A stale history response must never replace the currently viewed role's list.
const {createLibrary}=await import('./library.js');
class FixtureNode {
 constructor(tag,cls,text){this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.events={};this.hidden=false}
 append(...items){this.children.push(...items)} replaceChildren(...items){this.children=items}
 addEventListener(n,f){this.events[n]=f}setAttribute(){}removeAttribute(){}focus(){}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)])}
 click(){return this.events.click?.()}
}
FixtureNode.prototype.appendChild = function(node) { this.children.push(node); };
globalThis.document = {createElementNS: (_ns, tag) => new FixtureNode(tag)};
const make=(...args)=>new FixtureNode(...args),pendingHistory=new Map();
const shelf=createLibrary({el:make,button:(label,action,cls)=>{const n=make('button',cls,label);n.addEventListener('click',action);return n},getContext:()=>navContext,getSettings:()=>({allowAllCharacters:true}),navigation:{history:avatar=>new Promise(resolve=>pendingHistory.set(avatar,resolve))},onError:message=>assert.fail(message),onChat(){}});
const firstHistory=shelf.showHistory('one.png'),secondHistory=shelf.showHistory('two.png');
pendingHistory.get('two.png')(Array.from({length:13},(_,i)=>({file_name:'two-'+i,preview_message:i===12?'窗边的约定':''})));await secondHistory;
pendingHistory.get('one.png')([{file_name:'stale-one'}]);await firstHistory;
const more=shelf.root.querySelectorAll('button').find(n=>n.textContent==='加载更多对话');more.click();
const names=shelf.root.querySelectorAll('strong').map(n=>n.textContent);assert.equal(names.length,13);assert(names.every(n=>n.startsWith('two-')));
const historySearch=shelf.root.querySelectorAll('input').find(n=>n.id==='pm-history-search');
historySearch.events.compositionstart();historySearch.value='窗边';historySearch.events.input();
assert.equal(shelf.root.querySelectorAll('strong').length,13,'composition must not filter unfinished input');
historySearch.events.compositionend();assert.deepEqual(shelf.root.querySelectorAll('strong').map(n=>n.textContent),['two-12']);
historySearch.value='TWO-1';historySearch.events.input();assert.equal(shelf.root.querySelectorAll('strong').length,4);
historySearch.value='没有这段对话';historySearch.events.input();assert.equal(shelf.root.querySelectorAll('strong').length,0);
const clearHistorySearch=shelf.root.querySelectorAll('button').find(n=>n.textContent==='清除');clearHistorySearch.click();
assert.equal(historySearch.value,'');assert.equal(shelf.root.querySelectorAll('strong').length,12,'clear resets pagination');
console.log('PASS: history name/preview search, case folding, IME composition, no results, clearing and page reset.');
shelf.cancel();console.log('PASS: out-of-order history responses cannot contaminate another role or pagination.');
// Themes persist only appearance, separated by native account; preview cancellation never saves.
let painted, memory=new Map();
const appearanceStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
let preference=createThemePreference('alice',id=>painted=id,()=>appearanceStorage);
assert.equal(painted,'midnight');preference.preview('rain');assert.equal(painted,'rain');assert.equal(memory.size,0);
preference.restore();assert.equal(painted,'midnight');assert(preference.choose('rain'));
preference=createThemePreference('alice',id=>painted=id,()=>appearanceStorage);assert.equal(painted,'rain');
createThemePreference('bob',id=>painted=id,()=>appearanceStorage);assert.equal(painted,'midnight');
assert.throws(()=>preference.preview('unknown'),/未知/);
const unavailable=createThemePreference('alice',id=>painted=id,()=>{throw Error('blocked storage')});assert.equal(painted,'midnight');assert.equal(unavailable.choose('rain'),false);assert.equal(painted,'rain');
assert([...memory.keys()].every(key=>key.startsWith('PlayerMode.appearance.v1:')));
console.log('PASS: theme preview/cancel, reload preference, per-account separation, invalid theme and unavailable storage fallback.');
