import { chromium } from 'playwright';
const URL='http://127.0.0.1:8778/';
const R=[]; const ok=(n,c,d='')=>R.push([c,n,d]);
const stub=(uid,email)=>`
export const HAS_FIREBASE=true; export const MODE='firebase';
export const degraded=()=>false; export const degradedText=()=>'';
let u={uid:'${uid}',displayName:'Siddhartha Raja',email:'${email}',photoURL:''};
export async function initBackend(){} export function onAuth(cb){setTimeout(()=>cb(u),0);return()=>{};}
export const user=()=>u; export async function signIn(){} export async function signOutNow(){}
export const lastRedirectError=()=>'';
export const measure=(v)=>{try{return new Blob([JSON.stringify(v)]).size}catch{return 0}};
export async function loadSlice(){return {ok:true,exists:false,v:undefined,at:0};}
export async function saveSlice(){} export function watchSlice(){return()=>{};}
export async function writeSnapshot(){return 'x';} export async function listSnapshots(){return [];}
export async function readSnapshot(){return null;}
export const STORAGE_MODES=[['local','x']]; export const getStorageMode=()=>'local';
export function setStorageMode(){} export const HAS_DRIVE=false;
export async function uploadMedia(){throw new Error('no');}
export function storageErrorText(e){return String(e);} export async function deleteMedia(){}
export async function storageSelfTest(){return {ok:true,text:'stub'};}`;

const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({serviceWorkers:'block'});
let cur=stub('acct-A','si@gmail.com');
await ctx.route('**/js/backend.js', r=>r.fulfill({status:200,contentType:'text/javascript',body:cur}));
const boot=async(p)=>{await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.Sid&&!document.querySelector('#app').hidden,null,{timeout:25000});};

const p=await ctx.newPage();
p.on('pageerror',e=>ok('pageerror '+e.message,false));
await boot(p);
// first account: put some data in
await p.evaluate(()=>window.Sid.S.update('notes',s=>{s.items=[{id:'1',title:'account A work',body:''}]}));
await p.waitForTimeout(500);
const nameA=await p.evaluate(()=>document.querySelector('#user-name').textContent);
ok('the signed-in EMAIL is shown, not just the display name', nameA==='si@gmail.com', nameA);
const banner1=await p.evaluate(()=>{const b=document.querySelector('#health');return b&&!b.hidden?document.querySelector('#health-text').textContent:''});
ok('no warning on a normal return to the same account', !/signed in as/i.test(banner1), banner1.slice(0,70));

// now switch accounts — and give B its own data so "looks empty" would NOT catch it
cur=stub('acct-B','other@gmail.com');
await p.evaluate(()=>{
  const k='sid.v2.acct-B.slice.notes';
  localStorage.setItem(k, JSON.stringify({v:{items:[{id:'x',title:'B has data too',body:''}]},at:Date.now(),seq:999}));
  for (let i=0;i<4;i++) localStorage.setItem('sid.v2.acct-B.slice.f'+i, JSON.stringify({v:{a:1},at:Date.now(),seq:1}));
});
await boot(p);
const banner2=await p.evaluate(()=>{const b=document.querySelector('#health');return b&&!b.hidden?document.querySelector('#health-text').textContent:''});
ok('switching account is flagged even when the new account has its own data',
   /signed in as other@gmail.com/.test(banner2) && /si@gmail\.com/.test(banner2), banner2.slice(0,150));
ok('and it says nothing was lost', /Nothing has been lost/i.test(banner2), banner2.slice(0,80));

// A's data must be untouched
const aSafe=await p.evaluate(()=>localStorage.getItem('sid.v2.acct-A.slice.notes')||'');
ok("the other account's data is still on the device, untouched", /account A work/.test(aSafe), aSafe.slice(0,70));

// returning to the same account again = no banner
await boot(p);
const banner3=await p.evaluate(()=>{const b=document.querySelector('#health');return b&&!b.hidden?document.querySelector('#health-text').textContent:''});
ok('the warning does not nag once you stay on that account', !/signed in as/i.test(banner3), banner3.slice(0,70));

await b.close();
let bad=0; for(const [pass,n,d] of R){ if(!pass) bad++; console.log(`${pass?'PASS':'FAIL'}  ${n}${pass?'':'   << '+d}`);}
console.log(bad?`\n${bad} FAILED`:`\nall ${R.length} passed`);
process.exit(bad?1:0);
