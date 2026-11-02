'use strict';

/* == Asset Library == */
(()=>{
const $=(s,r=document)=>r.querySelector(s);
const order=['vdc','irs','eel','bundle'];
const releaseCompare=(a,b)=>{
const x=a.releaseOrder||[],y=b.releaseOrder||[],n=Math.max(x.length,y.length);
for(let i=0;i<n;i++){const d=(y[i]??-1)-(x[i]??-1);if(d)return d;}
return String(b.releaseName).localeCompare(String(a.releaseName),undefined,{numeric:true});
};
const labels={iem:'KZ EDX Pro',speaker:'Redmi 12 Speaker'};
const make=(tag,cls,text,parent)=>{
const el=document.createElement(tag);
if(cls)el.className=cls;
if(text!=null)el.textContent=text;
if(parent)parent.append(el);
return el;
};
const statusClass=s=>/experimental|optional/i.test(s)?'warn':/qualified|core|reviewed/i.test(s)?'good':'neutral';
const card=a=>{
const el=make('article','asset-card');
const top=make('div','asset-card-top',null,el);
make('span','asset-type',a.typeLabel,top);
make('span','asset-status '+statusClass(a.status),a.status,top);
make('h4','asset-name',a.name,el);
make('p','asset-release',a.releaseName||a.deviceName,el);
make('p','asset-note',a.note,el);
const pair=make('p','asset-pair',a.pairing,el);
if(a.warning)make('p','asset-warning',a.warning,el);
const meta=make('div','asset-meta',null,el);
make('span','',a.sizeLabel,meta);
const hash=make('button','asset-hash',null,meta);
hash.type='button';
hash.textContent='SHA-256 '+a.shaShort;
hash.title=a.sha256;
hash.addEventListener('click',async()=>{
try{
await navigator.clipboard.writeText(a.sha256);
hash.textContent='Hash copied';
setTimeout(()=>hash.textContent='SHA-256 '+a.shaShort,1400);
}catch{
hash.textContent=a.shaShort;
}
});
const link=make('a','btn asset-download','Download',el);
link.href=a.path;
link.download='';
link.setAttribute('aria-label','Download '+a.name);
return el;
};
const grid=(items,parent)=>{
const host=make('div','asset-grid',null,parent);
items.forEach(a=>host.append(card(a)));
return host;
};
const groupHeading=(name,count,parent)=>make('h4','asset-subhead',name+' · '+count,parent);
const renderHistory=(items,parent)=>{
const details=make('details','asset-archive',null,parent);
const summary=make('summary','asset-archive-summary',null,details);
make('span','',`Historical releases · ${items.length} files and bundles`,summary);
make('span','asset-archive-cue','Browse archive',summary);
for(const type of order){
const group=items.filter(a=>a.type===type).sort(releaseCompare);
if(!group.length)continue;
groupHeading(type==='bundle'?'Release bundles':type.toUpperCase(),group.length,details);
grid(group,details);
}
};
const renderDevice=(key,records)=>{
const root=$('#asset-'+key);
const active=records.filter(a=>a.active&&a.type!=='bundle').sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type));
const bundle=records.filter(a=>a.active&&a.type==='bundle');
const history=records.filter(a=>!a.active&&a.type!=='bundle');
const historyBundles=records.filter(a=>!a.active&&a.type==='bundle');
make('div','asset-device-title',null,root);
const title=$('.asset-device-title',root);
make('span','lbl',key==='iem'?'IEM · ESTABLISHED PROFILE':'SPEAKER · ESTABLISHED PROFILE',title);
make('h3','',labels[key],title);
make('p','asset-device-note',key==='iem'?'v5-HD · selected core release':'V6 · selected core release',title);
grid(active,root);
if(bundle.length){
const b=make('div','asset-bundle-row',null,root);
make('span','asset-bundle-label','Complete core release',b);
b.append(card(bundle[0]));
}
renderHistory(history.concat(historyBundles).sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type)||releaseCompare(a,b)),root);
};
fetch('assets.json',{cache:'no-cache'}).then(r=>{
if(!r.ok)throw Error('Asset manifest unavailable');
return r.json();
}).then(data=>{
const assets=Array.isArray(data.assets)?data.assets:[];
renderDevice('iem',assets.filter(a=>a.device==='iem'));
renderDevice('speaker',assets.filter(a=>a.device==='speaker'));
const shared=assets.filter(a=>a.device==='shared');
const root=$('#asset-shared');
if(shared.length){
make('div','asset-device-title',null,root);
make('span','lbl','SHARED · OPTIONAL',root.firstChild);
make('h3','', 'Add-ons and complete library',root.firstChild);
const core=shared.filter(a=>a.type!=='bundle');
const bundles=shared.filter(a=>a.type==='bundle');
if(core.length)grid(core,root);
if(bundles.length){groupHeading('Library bundle',bundles.length,root);grid(bundles,root);}
}
}).catch(e=>{
['asset-iem','asset-speaker','asset-shared'].forEach(id=>{
const root=$('#'+id);
if(root)make('p','qa-note','Asset index unavailable: '+e.message,root);
});
});
})();
