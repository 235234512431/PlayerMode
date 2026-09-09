// Dependency-free isolated tests; no real server, password or user settings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createCredential, verifyPassword } from './security.js';
import { createSettingsStore, validSettings } from './settings.js';
const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const old = {version:1, credential:await createCredential('fixture-old')};
const fresh = {version:1, credential:await createCredential('fixture-new')};
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
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.events={};this.value='';this.isConnected=true;this.classList={add(){}};nodes.push(this)}
  append(...children){this.children.push(...children)}
  addEventListener(n,f){this.events[n]=f}setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}
  focus(){document.activeElement=this}showModal(){}close(){}remove(){this.removed=true;this.isConnected=false}
  click(){return this.events.click?.()}
 }
 const body=new Element('body');body.classList={toggle:(c,on)=>on?classes.add(c):classes.delete(c)};
 document.body=body;document.createElement=t=>new Element(t);
 document.querySelector=s=>s==='#option_start_new_chat'?{click(){nativeClicks++}}:body;
 document.addEventListener=(n,f)=>{key=f};
 const context={name2:'Test',getRequestHeaders:()=>({}),extensionSettings:config?{PlayerMode:structuredClone(config)}:{},eventTypes:{APP_READY:'ready',SETTINGS_UPDATED:'saved',CHAT_CHANGED:'chat'},eventSource:{on(n,f){if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(f);if(n==='ready')f()},removeListener(n,f){listeners.get(n)?.delete(f)}},saveSettingsDebounced(){if(!rejectSave)server=structuredClone(context.extensionSettings.PlayerMode);listeners.get('saved')?.forEach(f=>f())}};
 const instance = vm.createContext({document,console:{log(){},warn(){}},crypto:globalThis.crypto,createCredential,verifyPassword,createSettingsStore,validSettings,setTimeout:()=>0,clearTimeout(){},SillyTavern:{getContext:()=>context}});
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
app.button('＋ 新对话');assert.equal(app.nativeClicks,1);
app.button('退出玩家模式');app.field('pm-current','fixture-new');await app.submit();
app.button('设置／修改统一退出密码');app.field('pm-current','wrong');app.field('pm-password','changed-fixture');app.field('pm-confirm','changed-fixture');await app.submit();assert.equal(server,fresh);
app.field('pm-current','fixture-new');rejectSave=true;await app.submit();assert(!app.classes.has('playermode-active'));assert.equal(app.nodes.findLast(n=>n.id==='pm-password').value,'changed-fixture');assert.equal(cleanup,0);
rejectSave=false;await app.submit();assert(app.classes.has('playermode-active'));assert(await verifyPassword('changed-fixture',server.credential));assert.equal(cleanup,1);
server=null;app=boot(null);assert(!app.classes.has('playermode-active'));app.button('设置／修改统一退出密码');app.field('pm-password','first-fixture');app.field('pm-confirm','first-fixture');await app.submit();assert(app.classes.has('playermode-active'));assert(boot().classes.has('playermode-active'));
assert(!source.includes('getItem('));assert(!source.includes('playermode=0'));assert(!source.includes('window.alert'));
console.log('PASS: shared setup, fresh visitor, latest password, wrong password, offline, save/readback failure, retry, old-state ignored, temporary unlock, reload lock, change-password gate, keyboard/cancel, native new-chat forwarding.');
