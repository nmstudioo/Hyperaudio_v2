'use strict';

/* == Dock and Device State == */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const rows=$$('.prow'),keys=$$('[data-dock]');
const sync=()=>{
const on=rows.find(r=>r.getAttribute('aria-pressed')==='true');
if(!on)return;
document.documentElement.dataset.dev=on.dataset.k;
keys.forEach(k=>k.setAttribute('aria-pressed',String(k.dataset.dock===on.dataset.k)));
};
keys.forEach(k=>k.addEventListener('click',()=>{
const r=rows.find(x=>x.dataset.k===k.dataset.dock);
if(r)r.click();
}));
const mo=new MutationObserver(sync);
rows.forEach(r=>mo.observe(r,{attributes:true,attributeFilter:['aria-pressed']}));
sync();
})();

/* == Library Search and Filter == */
(()=>{
const root=document.querySelector('#assets');
if(!root)return;
const q=(s,r=root)=>r.querySelector(s),qa=(s,r=root)=>[...r.querySelectorAll(s)];
const bar=document.createElement('div');
bar.className='lib-bar';
bar.innerHTML='<input class="lib-search" type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search name, release, note, hash" aria-label="Search assets"><span class="lib-count" role="status" aria-live="polite"></span><div class="lib-chips" role="group" aria-label="Filter assets"></div>';
const chips=q('.lib-chips',bar),input=q('.lib-search',bar),count=q('.lib-count',bar);
const state={t:'all',d:'all'};
const defs=[['t','all','All'],['t','VDC','VDC'],['t','IRS','IRS'],['t','EEL','EEL2'],['t','BUNDLE','Bundles'],['d','all','Any device'],['d','iem','IEM'],['d','speaker','Speaker'],['d','shared','Shared']];
defs.forEach(([k,v,l])=>{
const b=document.createElement('button');
b.type='button';
b.textContent=l;
b.dataset.k=k;
b.dataset.v=v;
b.setAttribute('aria-pressed',String(state[k]===v));
chips.append(b);
});
const first=q('.asset-device');
first.before(bar);
const apply=()=>{
const term=input.value.trim().toLowerCase();
const cards=qa('.asset-card');
let shown=0;
cards.forEach(c=>{
const type=(q('.asset-type',c)?.textContent||'').trim().toUpperCase();
const dev=c.closest('.asset-device')?.id.replace('asset-','')||'';
const okT=state.t==='all'||type===state.t||(state.t==='BUNDLE'&&/BUNDLE|ZIP|LIBRARY/.test(type));
const okD=state.d==='all'||dev===state.d;
const okQ=!term||c.textContent.toLowerCase().includes(term)||(q('.asset-hash',c)?.title||'').toLowerCase().includes(term);
const ok=okT&&okD&&okQ;
c.hidden=!ok;
if(ok)shown++;
});
qa('.asset-grid').forEach(g=>{g.hidden=!qa('.asset-card',g).some(c=>!c.hidden);});
qa('.asset-subhead').forEach(h=>{
const g=h.nextElementSibling;
h.hidden=!!g&&g.classList.contains('asset-grid')&&g.hidden;
});
qa('.asset-bundle-row').forEach(b=>{b.hidden=!qa('.asset-card',b).some(c=>!c.hidden);});
qa('.asset-device').forEach(d=>{d.hidden=!!d.firstChild&&!qa('.asset-card',d).some(c=>!c.hidden);});
const filtering=term||state.t!=='all'||state.d!=='all';
qa('.asset-archive').forEach(a=>{
const has=qa('.asset-card',a).some(c=>!c.hidden);
a.hidden=!has;
if(filtering&&has)a.open=true;
});
count.textContent=shown+' of '+cards.length+' files';
};
input.addEventListener('input',apply);
chips.addEventListener('click',e=>{
const b=e.target.closest('button');
if(!b)return;
state[b.dataset.k]=b.dataset.v;
qa('button',chips).filter(x=>x.dataset.k===b.dataset.k).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
apply();
});
const mo=new MutationObserver(()=>{
clearTimeout(mo.t);
mo.t=setTimeout(apply,60);
});
qa('.asset-device').forEach(d=>mo.observe(d,{childList:true,subtree:true}));
apply();
})();
