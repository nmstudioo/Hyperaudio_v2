
'use strict';

/* == Constants == */
const FS=48000,FN=65536,TIMEOUT=12e3,PI=Math.PI,db=x=>20*Math.log10(Math.max(1e-30,x));

/* == Analysis == */
function fft(re,im){
const n=re.length;
for(let i=1,j=0;i<n;i++){
let b=n>>1;
for(;j&b;b>>=1)j^=b;
j^=b;
if(i<j){
[re[i],re[j]]=[re[j],re[i]];
[im[i],im[j]]=[im[j],im[i]];
}
}
for(let l=2;l<=n;l<<=1){
const an=-2*PI/l,wr=Math.cos(an),wi=Math.sin(an),h=l>>1;
for(let i=0;i<n;i+=l){
let cr=1,ci=0;
for(let k=0;k<h;k++){
const a=i+k,b=a+h,xr=re[b]*cr-im[b]*ci,xi=re[b]*ci+im[b]*cr;
re[b]=re[a]-xr;
im[b]=im[a]-xi;
re[a]+=xr;
im[a]+=xi;
const t=cr*wr-ci*wi;
ci=cr*wi+ci*wr;
cr=t;
}
}
}
}

function parseWav(buf){
const v=new DataView(buf),tag=o=>String.fromCharCode(v.getUint8(o),v.getUint8(o+1),v.getUint8(o+2),v.getUint8(o+3));
if(buf.byteLength<44||tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('IRS must be a RIFF/WAVE file');
let fmt=null,data=null,offset=12;
while(offset+8<=buf.byteLength){
const id=tag(offset),size=v.getUint32(offset+4,true),start=offset+8;
if(start+size>buf.byteLength)throw Error('IRS contains a truncated WAV chunk');
if(id==='fmt '){
if(size<16)throw Error('IRS format chunk is incomplete');
fmt={format:v.getUint16(start,true),channels:v.getUint16(start+2,true),sr:v.getUint32(start+4,true),block:v.getUint16(start+12,true),bits:v.getUint16(start+14,true)};
}
if(id==='data')data={offset:start,size};
offset=start+size+(size&1);
}
if(!fmt||!data)throw Error('IRS is missing its WAV format or data chunk');
const channels=fmt.channels,frames=data.size/(channels*4);
const ok=fmt.format===3&&fmt.bits===32&&fmt.block===channels*4&&(channels===2||channels===4)&&fmt.sr===FS&&Number.isInteger(frames)&&frames>=256&&frames<=FN;
if(!ok)throw Error('IRS must be 2- or 4-channel float32 WAV at 48 kHz, with 256–65536 frames');
const samples=new Float32Array(frames*channels);
for(let i=0;i<samples.length;i++)samples[i]=v.getFloat32(data.offset+i*4,true);
return{channels,frames,sr:fmt.sr,samples};
}

function parseVdc(text){
const rows=text.trim().split(/\r?\n/).map(line=>/^SR_(\d+):\s*(.+)$/.exec(line.trim()));
if(!rows.length||rows.some(row=>!row))throw Error('VDC must contain SR_44100 and SR_48000 coefficient lines');
const rates={};
for(const row of rows){
const rate=+row[1],values=row[2].split(',').map(Number);
if(![44100,48000].includes(rate)||!values.length||values.length%5||values.some(v=>!Number.isFinite(v)))throw Error('VDC contains an invalid coefficient row');
const sections=[];
for(let i=0;i<values.length;i+=5){
const [b0,b1,b2,a1,a2]=values.slice(i,i+5),disc=a1*a1+4*a2;
let radius;
if(disc>=0){
const r1=(a1+Math.sqrt(disc))/2,r2=(a1-Math.sqrt(disc))/2;
radius=Math.max(Math.abs(r1),Math.abs(r2));
}else radius=Math.sqrt(Math.max(0,-a2));
sections.push({b0,b1,b2,a1,a2,radius});
}
rates[rate]=sections;
}
if(!rates[FS]||!rates[44100]||rates[FS].length!==rates[44100].length)throw Error('VDC must contain matching 44.1 and 48 kHz banks');
const sections=rates[FS],maxPole=Math.max(...sections.map(s=>s.radius));
return{rates,sections,stages:sections.length,maxPole,stable:sections.every(s=>s.radius<1),identity:sections.every(s=>s.b0===1&&s.b1===0&&s.b2===0&&s.a1===0&&s.a2===0)};
}

function vdcMagnitude(sections,f){
const w=2*PI*f/FS,c1=Math.cos(w),s1=-Math.sin(w),c2=Math.cos(2*w),s2=-Math.sin(2*w);
let mag=1;
for(const q of sections){
const nr=q.b0+q.b1*c1+q.b2*c2,ni=q.b1*s1+q.b2*s2;
const dr=1-q.a1*c1-q.a2*c2,di=-q.a1*s1-q.a2*s2;
mag*=Math.hypot(nr,ni)/Math.max(1e-30,Math.hypot(dr,di));
}
return mag;
}

function eelInfo(t){
const cnt=r=>(t.match(r)||[]).length,def={},bad=[];
for(const l of t.split(/\r?\n/)){
const m=/^(\w+):(-?[\d.]+)<(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)(?:\{[^}]*\})?>\s*\S/.exec(l);
if(m){
def[m[1]]=+m[2];
if(+m[2]<+m[3]||+m[2]>+m[4])bad.push(m[1]);
}
}
const names=Object.keys(def),init=/^@init\b([\s\S]*?)^@sample\b/m.exec(t),unset=init?names.filter(n=>!new RegExp('^\\s*'+n+'\\s*=','m').test(init[1])):names;
let ceil=def.ceiling10!=null?def.ceiling10/10:def.ceilDb10!=null?def.ceilDb10/10:def.ceiling10!=null?def.ceiling10/10:NaN;
if(isNaN(ceil)){
const m=/limMode\s*==\s*0\s*\?\s*\(\s*effCeil\s*=\s*(-?[\d.]+)/.exec(t);
if(m)ceil=+m[1];
}
const ok=cnt(/@init/g)===1&&cnt(/@sample/g)===1&&/^desc:/m.test(t)&&names.length>0&&!bad.length&&!unset.length;
return{ok,sliders:names.length,ceil,issues:[...bad.map(n=>n+' out of range'),...unset.map(n=>n+' not set in @init')]};
}

function analyse(buf,vdcText,eelText){
const irs=parseWav(buf),vdc=parseVdc(vdcText),c={};
const{channels,n,sr,samples}= {channels:irs.channels,n:irs.frames,sr:irs.sr,samples:irs.samples};
const matrices=Array.from({length:channels},()=>new Float64Array(FN));
let fin=true,peak=0,peakIndex=0,l1=0,tail=0,total=0,front=0,maxGain=0;
for(let i=0;i<n;i++){
let e=0;
for(let ch=0;ch<channels;ch++){
const x=samples[i*channels+ch],a=Math.abs(x);
if(!Number.isFinite(x))fin=false;
if(a>peak){peak=a;peakIndex=i;}
if(i>=n-256)tail=Math.max(tail,a);
l1+=a;
e+=x*x;
matrices[ch][i]=Number.isFinite(x)?x:0;
}
total+=e;
if(i<n/10)front+=e;
}
const diag=channels===4?[0,3]:[0,1];
let symmetry=true;
if(channels===2){
for(let i=0;i<n;i++)if(Math.abs(samples[2*i]-samples[2*i+1])>1e-7){symmetry=false;break;}
}else{
for(let i=0;i<n;i++)if(Math.abs(samples[4*i]-samples[4*i+3])>1e-7||Math.abs(samples[4*i+1]-samples[4*i+2])>1e-7){symmetry=false;break;}
}
const re=[],im=[];
for(let ch=0;ch<channels;ch++){
const r=matrices[ch],q=new Float64Array(FN);
fft(r,q);
re.push(r);im.push(q);
}
const magnitude=(ch,k)=>Math.hypot(re[ch][k],im[ch][k]);
for(let k=Math.ceil(20*FN/FS);k<=Math.floor(2e4*FN/FS);k++){
const f=k*FS/FN,vGain=vdcMagnitude(vdc.sections,f);
let chain;
if(channels===4){
const a={r:re[0][k],i:im[0][k]},b={r:re[2][k],i:im[2][k]},c1={r:re[1][k],i:im[1][k]},d={r:re[3][k],i:im[3][k]};
const aa=a.r*a.r+a.i*a.i+c1.r*c1.r+c1.i*c1.i,dd=b.r*b.r+b.i*b.i+d.r*d.r+d.i*d.i;
const qr=a.r*b.r+a.i*b.i+c1.r*d.r+c1.i*d.i,qi=a.r*b.i-a.i*b.r+c1.r*d.i-c1.i*d.r;
const eig=(aa+dd+Math.sqrt((aa-dd)*(aa-dd)+4*(qr*qr+qi*qi)))/2;
chain=Math.sqrt(Math.max(0,eig))*vGain;
}else chain=Math.max(magnitude(0,k),magnitude(1,k))*vGain;
if(chain>maxGain)maxGain=chain;
}
const resp=f=>{
const k=f*FN/FS,k0=Math.max(1,Math.floor(k*2**(-1/12))),k1=Math.max(k0,Math.min(FN/2,Math.ceil(k*2**(1/12))));
let power=0,count=0;
for(const ch of diag){
for(let i=k0;i<=k1;i++){
power+=re[ch][i]*re[ch][i]+im[ch][i]*im[ch][i];
count++;
}
}
return db(Math.sqrt(power/Math.max(1,count))*vdcMagnitude(vdc.sections,f));
};
const eel=eelInfo(eelText),peakDb=db(peak),tailDb=db(tail),l1Norm=l1/Math.max(1,channels);
Object.assign(c,{fmt:true,fin,symmetry,lr:symmetry,peak:peakDb<=0,tail:tailDb<=-80,vdc:vdc.stable,eel:eel.ok,gain:Number.isFinite(maxGain),l1:Number.isFinite(l1Norm)});
const result={n,channels,sr,peak:peakDb,pk:peakIndex,l1:l1Norm,tail:tailDb,maxGain:db(maxGain),front:total?front/total:0,resp,vdc:vdc.stages,vdcInfo:vdc,eel,c,pass:Object.values({fmt:c.fmt,fin:c.fin,symmetry:c.symmetry,peak:c.peak,tail:c.tail,vdc:c.vdc,eel:c.eel}).every(Boolean)};
return result;
}

/* == State == */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg',svg=(t,a,p)=>{
const e=document.createElementNS(NS,t);
for(const k in a)e.setAttribute(k,a[k]);
if(p)p.append(e);
return e;
};
const PROF={};
$$('.prow').forEach(b=>PROF[b.dataset.k]={...b.dataset,btn:b});
let cur='iem',cs=null,tt=0;
const cache={};
window.HAProfiles={current:()=>PROF[cur],all:()=>Object.values(PROF)};

/* == Loading == */
const load=p=>cache[p.k]||(cache[p.k]=(async()=>{
const once=async(u,t)=>{
const c=new AbortController(),id=setTimeout(()=>c.abort(),TIMEOUT);
try{
const r=await fetch(u,{signal:c.signal});
if(!r.ok)throw Error(`${u} → HTTP ${r.status}`);
return await r[t]();
}catch(e){
throw e.name=='AbortError'?Error(`${u} → timed out`):e;
}finally{
clearTimeout(id);
}
},get=(u,t)=>once(u,t).catch(e=>/HTTP 4\d\d/.test(e.message)?Promise.reject(e):once(u,t));
const[i,v,e]=await Promise.all([get(p.irs,'arrayBuffer'),get(p.vdc,'text'),get(p.eel,'text')]);
return analyse(i,v,e);
})().catch(e=>{
delete cache[p.k];
return{err:e.message+(navigator.onLine?'':' (offline)'),pass:false};
}));

/* == Helpers == */
const spark=(p,a)=>{
const r=a.resp(1000),d=Array.from({length:48},(_,i)=>{
const v=Math.max(-12,Math.min(12,a.resp(20*1000**(i/47))-r));
return(i?'L':'M')+(i*120/47).toFixed(1)+' '+(16-v*14/12).toFixed(1);
}).join('');
$('.spark path',p.btn).setAttribute('d',d);
};

const ico=(id,c)=>{
const s=svg('svg',{class:'i '+(c||'xs'),'aria-hidden':'true',focusable:'false'});
svg('use',{href:'#i-'+id},s);
return s;
};
const mob=()=>matchMedia('(max-width:899px)').matches,calm=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const NUM=/-?\d+(?:\.\d+)?/;
function count(el,txt){
cancelAnimationFrame(el._r);
const m=NUM.exec(txt),to=m?parseFloat(m[0]):NaN,from=parseFloat(el.dataset.v);
el.dataset.v=isNaN(to)?'':to;
if(isNaN(to)||mob()||calm()){
el.textContent=txt;
return;
}
const dec=(m[0].split('.')[1]||'').length,a=isNaN(from)?0:from,t0=performance.now();
const tick=t=>{
const k=Math.min(1,(t-t0)/400),v=a+(to-a)*(1-Math.pow(1-k,3));
el.textContent=k<1?txt.replace(NUM,v.toFixed(dec)):txt;
if(k<1)el._r=requestAnimationFrame(tick);
};
el._r=requestAnimationFrame(tick);
}
const dot=(p,a)=>{
p.btn.dataset.qa=a.err?'warn':a.pass?'ok':'bad';
$('.pdot .sr',p.btn).textContent='QA '+(a.err?'unavailable':a.pass?'pass':'fail');
};
const sweep=b=>{
b.classList.remove('sweep');
void b.offsetWidth;
b.classList.add('sweep');
};

function toast(msg,err){
const t=$('#toast');
t.replaceChildren(ico(err?'alert':'check'),msg);
t.className='toast'+(err?' err':'');
void t.offsetWidth;
t.classList.add('show');
clearTimeout(tt);
tt=setTimeout(()=>t.classList.remove('show'),3000);
}

const copyText=s=>{
const fb=()=>{
const t=document.createElement('textarea');
t.value=s;
t.style.cssText='position:fixed;opacity:0';
document.body.append(t);
t.select();
let ok=false;
try{ok=document.execCommand('copy')}catch{}
t.remove();
return ok;
};
return navigator.clipboard&&isSecureContext?navigator.clipboard.writeText(s).then(()=>true,fb):Promise.resolve(fb());
};

function dlAll(){
load(PROF[cur]).then(a=>{
if(!a.pass)return toast('QA failed — download blocked',1);
['irs','eel','vdc'].forEach((k,i)=>setTimeout(()=>$('#dl-'+k).click(),i*350));
toast('Downloading 3 files');
});
}

/* == Chart == */
function ghost(){
const l=$('#line');
if(!l.getAttribute('d'))return;
const gh=svg('g',{class:'gh','aria-hidden':'true'},$('#chartSvg'));
[$('#grid'),$('#area'),l].forEach(n=>{
const c=n.cloneNode(true);
c.removeAttribute('id');
if(n==l)c.setAttribute('class','old-l');
gh.append(c);
});
setTimeout(()=>gh.remove(),400);
}

function drawChart(a,anim){
const host=$('#chart'),W=host.clientWidth-16,g=$('#grid');
if(W<100)return;
if(anim)ghost();
g.replaceChildren();
if(!a||a.err){
cs=null;
$('#line').setAttribute('d','');
$('#area').setAttribute('d','');
$('#dot')&&$('#dot').setAttribute('r',0);
$('#chartSum').textContent=a?'Response unavailable: '+a.err:'';
return;
}
const H=Math.round(Math.max(236,Math.min(400,W*.44))),m={l:W<420?30:38,r:10,t:24,b:34};
const data=Array.from({length:240},(_,i)=>{
const f=20*1000**(i/239);
return[f,a.resp(f)];
});
const ys=data.map(d=>d[1]),lo=Math.min(...ys),hi=Math.max(...ys),pad=Math.max(1.5,(hi-lo)*.1),y0=Math.floor(lo-pad),y1=Math.ceil(hi+pad),sp=y1-y0,st=sp>30?10:sp>12?5:2;
const X=v=>m.l+Math.log10(v/20)/3*(W-m.l-m.r),Y=v=>m.t+(y1-v)/(y1-y0)*(H-m.t-m.b);
cs={data,W,m,X,Y,r1:a.resp(1000)};
$('#chartSvg').setAttribute('viewBox',`0 0 ${W} ${H}`);
const txt=(x,y,t,an,c)=>{
svg('text',{x,y,'text-anchor':an,class:'ax'+(c?' '+c:'')},g).textContent=t;
};
/* horizontal dB grid; the 0 dB line is the project gate */
for(let v=Math.ceil(y0/st)*st;v<=y1;v+=st){
const y=Y(v);
svg('line',{x1:m.l,x2:W-m.r,y1:y,y2:y,class:v?'gl':'gl z'},g);
txt(m.l-6,y+3.5,v,'end',v?'':'zl');
if(!v)txt(m.l+6,y-5,'0 dB reference','start','zl');
}
txt(m.l-6,11,'dB','end','unit');
/* octave-ish frequency grid */
[20,50,100,200,500,1e3,2e3,5e3,1e4,2e4].forEach(v=>{
const x=X(v);
svg('line',{x1:x,x2:x,y1:m.t,y2:H-m.b,class:'gl'},g);
txt(x,H-16,v>=1e3?v/1e3+'k':v,'middle');
});
txt((m.l+W-m.r)/2,H-3,'Hz','middle','unit');
/* tonal bands */
[250,4e3].forEach(v=>svg('line',{x1:X(v),x2:X(v),y1:6,y2:H-m.b,class:'gl b'},g));
[[20,250,'Bass'],[250,4e3,'Mids'],[4e3,2e4,'Treble']].forEach(([lo_,hi_,n])=>txt(X(Math.sqrt(lo_*hi_)),12,n,'middle','band'));
const d=data.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('');
$('#line').setAttribute('d',d);
$('#area').setAttribute('d',`${d}L${X(2e4)} ${Y(y0)}L${X(20)} ${Y(y0)}Z`);
const c=$('#cur');
c.setAttribute('y1',m.t);
c.setAttribute('y2',H-m.b);
c.style.display='none';
$('#tip').hidden=true;
/* peak and dip markers */
const mx=data.reduce((p,q)=>q[1]>p[1]?q:p),mn=data.reduce((p,q)=>q[1]<p[1]?q:p);
const mark=(q,cls,up)=>{
const x=X(q[0]),y=Y(q[1]),an=x<m.l+34?'start':x>W-m.r-34?'end':'middle',dx=an=='start'?-4:an=='end'?4:0;
svg('circle',{cx:x,cy:y,r:3.6,class:'mk '+cls},g);
svg('text',{x:x+dx,y:y+(up?-9:17),'text-anchor':an,class:'mk-t'},g).textContent=(q[1]>0?'+':'')+q[1].toFixed(1)+' dB';
};
if(hi-lo>.6){
mark(mx,'hi',1);
mark(mn,'lo',0);
}
/* cursor dot rides the curve */
let dot=$('#dot');
if(!dot)dot=svg('circle',{id:'dot',r:0},$('#chartSvg'));
dot.setAttribute('r',0);
$('#chartSum').textContent=`${PROF[cur].name}: predicted direct-path peak ${mx[1].toFixed(1)} dB near ${Math.round(mx[0])} Hz, dip ${mn[1].toFixed(1)} dB near ${Math.round(mn[0])} Hz.`;
if(anim){
host.classList.remove('draw');
void host.offsetWidth;
host.classList.add('draw');
}
}

function tip(f){
if(!cs)return;
const{data,W,m,X,Y,r1}=cs,host=$('#chart'),t=$('#tip'),x=X(f),i=Math.max(0,Math.min(239,Math.round(Math.log10(f/20)/3*239))),g=data[i][1],rel=g-r1;
$('#tip-f').textContent=Math.round(f)+' Hz';
$('#tip-g').textContent=g.toFixed(1)+' dB';
$('#tip-r').textContent=(rel>=0?'+':'−')+Math.abs(rel).toFixed(1)+' dB';
t.hidden=false;
t.style.left=Math.max(4,Math.min(host.clientWidth-t.offsetWidth-4,x+8-t.offsetWidth/2))+'px';
const c=$('#cur');
c.setAttribute('x1',x);
c.setAttribute('x2',x);
c.style.display='';
const dot=$('#dot');
dot.setAttribute('cx',x);
dot.setAttribute('cy',Y(g));
dot.setAttribute('r',4.5);
host._f=f;
}

const hideTip=()=>{
$('#tip').hidden=true;
$('#cur').style.display='none';
const d=$('#dot');
d&&d.setAttribute('r',0);
};

/* == Render == */
function show(a){
const ok=!a.err&&a.pass,cls=ok?'ok':'bad',set=(id,v,s)=>{
count($('#st-'+id),v);
$('#st-'+id+'-s').textContent=s||'';
};
if(a.err){
['irs','gain','peak','l1','lim'].forEach(k=>set(k,'—'));
$('#st-irs-s').textContent=a.err;
}else{
set('irs',`${a.n} taps`,`${a.channels}-channel float32 · ${a.sr/1000} kHz`);
set('gain',a.maxGain.toFixed(2)+' dB','predicted maximum chain gain');
set('peak',a.peak.toFixed(2)+' dBFS','at tap '+a.pk);
set('l1',a.l1.toFixed(4),'diagnostic · per channel average');
set('lim',isNaN(a.eel.ceil)?'—':a.eel.ceil.toFixed(1)+' dBFS','EEL default');
}
[$('#qaChip'),$('#qaBadge')].forEach(e=>{
e.replaceChildren(ico(a.err?'alert':ok?'check':'close'),a.err?'QA · ERROR':ok?'QA · PASS':'QA · FAIL');
e.className='chip '+cls;
});
const s=$('#qaSeal');
s.replaceChildren(ico(a.err?'alert':ok?'check':'close'),a.err?'Audit unavailable':ok?'Verified · hosted files':'Verification failed');
s.className='st '+cls;
const D=a.err?{}:{fmt:`${a.n} taps · ${a.channels} channels · ${a.sr/1000} kHz`,lr:a.channels===4?'4-channel true-stereo matrix symmetry': '2-channel linked stereo symmetry',peak:a.peak.toFixed(2)+' dBFS',gain:a.maxGain.toFixed(2)+' dB · diagnostic',l1:a.l1.toFixed(4)+' · diagnostic',tail:`last 256 taps ${a.tail.toFixed(1)} dBFS`,vdc:`${a.vdc} stages · max pole ${a.vdcInfo.maxPole.toFixed(6)}`,eel:a.eel.ok?`${a.eel.sliders} sliders`:a.eel.issues.join(', ')||'structure invalid'};
const rows=$$('.crow');
rows.forEach(r=>r.className='crow');
void rows[0].offsetWidth;
rows.forEach((r,i)=>{
const k=r.dataset.c,g=!a.err&&a.c[k];
r.className='crow'+(a.err?'':g?' ok':' bad');
r.style.setProperty('--d',i*35+'ms');
$('small',r).textContent=D[k]?'— '+D[k]:'';
$('b',r).replaceChildren(...(a.err?['—']:[ico(g?'check':'close'),g?'Pass':'Fail']));
});
const fb=$('#fab');
fb.setAttribute('aria-disabled',!ok);
if(ok&&!a.pl){
a.pl=1;
fb.classList.remove('pulse');
void fb.offsetWidth;
fb.classList.add('pulse');
}
drawChart(a,1);
}

function render(){
const p=PROF[cur];
for(const k in PROF)PROF[k].btn.setAttribute('aria-pressed',k==cur);
['irs','eel','vdc'].forEach(k=>{
const a=$('#dl-'+k);
a.href=p[k];
$('small',a).textContent=p[k].split('/').pop();
});
$('#st-dev').textContent=p.name;
$$('.crow').forEach(r=>{
r.className='crow';
$('b',r).textContent='…';
});
load(p).then(a=>{
if(cur==p.k)show(a);
});
window.dispatchEvent(new CustomEvent('ha:profilechange',{detail:{profile:p}}));
}

/* == Verification Harness == */
const con=$('#console'),log=(t,ok)=>{
const d=document.createElement('div');
d.textContent=t;
if(ok!=null)d.className=ok?'ok':'bad';
con.append(d);
con.scrollTop=con.scrollHeight;
};

async function runAB(){
const btn=$('#btnAB');
if(btn.getAttribute('aria-busy'))return;
btn.setAttribute('aria-busy','true');
con.replaceChildren();
const R=[],res=(n,d,ok)=>{
R.push(ok);
log(`${ok?'✓':'✗'} ${n}: ${d}`,ok);
};
log('Running offline checks on hosted files…');
for(const k in PROF){
const p=PROF[k],a=await load(p);
if(a.err){
res(p.name,a.err,false);
continue;
}
res(p.name+' · IRS format',`${a.n} taps · ${a.channels} channels · ${a.sr/1000} kHz`,a.c.fmt);
res(p.name+' · IRS integrity',`finite ${a.c.fin?'yes':'no'} · peak ${a.peak.toFixed(2)} dBFS · tail ${a.tail.toFixed(1)} dBFS`,a.c.fin&&a.c.peak&&a.c.tail);
res(p.name+' · channel matrix',a.channels===4?'4-channel true-stereo symmetry':'2-channel linked stereo symmetry',a.c.symmetry);
res(p.name+' · VDC stability',`${a.vdc} stages · maximum pole radius ${a.vdcInfo.maxPole.toFixed(6)}`,a.c.vdc);
res(p.name+' · EEL static parse',a.eel.ok?`${a.eel.sliders} sliders valid · one @init · one @sample`:a.eel.issues.join(', ')||'structure invalid',a.c.eel);
log(p.name+' · diagnostic gain '+a.maxGain.toFixed(2)+' dB · L1 '+a.l1.toFixed(4));
await new Promise(r=>setTimeout(r,20));
}
const all=R.every(Boolean);
log(all?'ALL CHECKS PASSED':'SOME CHECKS FAILED',all);
log('Scope: offline file checks only (static regex slider parse, not the app). No app, ARM, native convolver or listening evidence.');
btn.removeAttribute('aria-busy');
toast(all?'All checks pass':'Some checks failed',!all);
}

/* == Init == */
const idle=window.requestIdleCallback||(f=>setTimeout(f,200));
Object.values(PROF).forEach(p=>{
const go=()=>load(p).then(a=>{
dot(p,a);
if(!a.err)spark(p,a);
});
p.k==cur?go():idle(go);
});
$('#profiles').addEventListener('click',e=>{
const b=e.target.closest('.prow');
if(b&&(b.dataset.k!=cur||!cache[cur])){
cur=b.dataset.k;
render();
sweep(b);
}
});
$$('[data-all]').forEach(b=>b.addEventListener('click',()=>b.getAttribute('aria-disabled')=='true'?toast('Download blocked: QA not passed',1):dlAll()));
$('#btnGeq').onclick=()=>load(PROF[cur]).then(a=>a.err?toast('Copy failed',1):copyText('GraphicEQ: '+Array.from({length:127},(_,i)=>{
const f=20*1000**(i/126);
return f.toFixed(1)+' '+a.resp(f).toFixed(1);
}).join('; ')).then(ok=>toast(ok?'Copied · GraphicEQ':'Copy failed',!ok)));
$('#btnAB').onclick=runAB;
const THEME_BG={dark:'#0c100f',light:'#f3f5f0'};
const applyTheme=t=>{
document.documentElement.dataset.theme=t;
document.querySelectorAll('meta[name=theme-color]').forEach((m,i)=>{
if(!i)m.removeAttribute('media');
m.content=THEME_BG[t];
if(i)m.remove();
});
};
$('#themeBtn').onclick=()=>{
const t=document.documentElement.dataset.theme=='dark'?'light':'dark',go=()=>{
applyTheme(t);
try{localStorage.theme=t}catch{}
};
document.startViewTransition&&!calm()?document.startViewTransition(go):go();
};
matchMedia('(prefers-color-scheme:light)').addEventListener('change',e=>{
let s;
try{s=localStorage.theme}catch{}
if(!s)document.documentElement.dataset.theme=e.matches?'light':'dark';
});
const ch=$('#chart');
let pm=0;
ch.addEventListener('pointermove',e=>{
if(!cs||pm)return;
const cx=e.clientX;
pm=requestAnimationFrame(()=>{
pm=0;
if(!cs)return;
const r=$('#chartSvg').getBoundingClientRect(),x=(cx-r.left)*cs.W/r.width;
tip(20*1000**Math.max(0,Math.min(1,(x-cs.m.l)/(cs.W-cs.m.l-cs.m.r))));
});
});
ch.addEventListener('pointerleave',hideTip);
ch.addEventListener('blur',hideTip);
ch.addEventListener('keydown',e=>{
if(e.key=='Escape')return hideTip();
if(e.key!='ArrowLeft'&&e.key!='ArrowRight')return;
e.preventDefault();
tip(Math.min(2e4,Math.max(20,(ch._f||1e3)*2**(e.key=='ArrowLeft'?-.15:.15))));
});
let rz=0,rw=0;
new ResizeObserver(([e])=>{
const w=Math.round(e.contentRect.width);
if(w==rw)return;
rw=w;
cancelAnimationFrame(rz);
rz=requestAnimationFrame(()=>load(PROF[cur]).then(a=>{
if(a.err||a.n)drawChart(a);
}));
}).observe(ch);

/* == Motion == */
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('hid',document.hidden));
$('#profiles').addEventListener('animationend',e=>{
if(e.animationName=='sweep')e.target.classList.remove('sweep');
});
$('#fab').addEventListener('animationend',e=>{
if(e.animationName=='pulse')e.target.classList.remove('pulse');
});
const up=$('#toTop');
up.onclick=()=>scrollTo({top:0});
if(window.IntersectionObserver){
new IntersectionObserver(([e])=>up.classList.toggle('show',!e.isIntersecting)).observe($('.hero'));
/* the response curve draws in when it is first seen, not while it is off-screen */
if(!calm()){
const seen=new IntersectionObserver(([e])=>{
if(!e.isIntersecting)return;
seen.disconnect();
if(!cs)return;
ch.classList.remove('draw');
void ch.offsetWidth;
ch.classList.add('draw');
},{threshold:.35});
seen.observe(ch);
}
}

/* == Start == */
render();
  
