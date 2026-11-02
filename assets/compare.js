'use strict';

/* == Live Compare == */
(()=>{
const $=s=>document.querySelector(s),FS=48000,PI=Math.PI,db=x=>20*Math.log10(Math.max(1e-12,x));
const el={source:$('#cmpSource'),file:$('#cmpFile'),play:$('#cmpPlay'),pause:$('#cmpPause'),stop:$('#cmpStop'),a:$('#cmpA'),b:$('#cmpB'),vdc:$('#cmpVdc'),irs:$('#cmpIrs'),status:$('#cmpStatus'),x:$('#cmpX'),guessA:$('#cmpGuessA'),guessB:$('#cmpGuessB'),reveal:$('#cmpReveal'),score:$('#cmpScore'),plot:$('#cmpPlotLine'),plotGrid:$('#cmpPlotGrid'),plotLabel:$('#cmpPlotLabel')};
let profile=null,assets=null,context=null,sourceBuffer=null,customBuffer=null,playing=false,offset=0,startedAt=0,sourceNodes=[],gates=[],active='a',matchDb=0,trial=null,guess=null,trials=0,correct=0;
const make=(tag,attrs,parent)=>{
const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
if(parent)parent.append(n);
return n;
};
const status=t=>{el.status.textContent=t;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function parseWav(buf){
const v=new DataView(buf),tag=o=>String.fromCharCode(v.getUint8(o),v.getUint8(o+1),v.getUint8(o+2),v.getUint8(o+3));
if(buf.byteLength<44||tag(0)!=='RIFF'||tag(8)!=='WAVE')throw Error('Impulse response is not RIFF/WAVE');
let fmt=null,data=null,off=12;
while(off+8<=buf.byteLength){
const id=tag(off),size=v.getUint32(off+4,true),start=off+8;
if(start+size>buf.byteLength)throw Error('Truncated impulse-response chunk');
if(id==='fmt '){
if(size<16)throw Error('Invalid WAV format chunk');
fmt={format:v.getUint16(start,true),channels:v.getUint16(start+2,true),rate:v.getUint32(start+4,true),align:v.getUint16(start+12,true),bits:v.getUint16(start+14,true)};
}
if(id==='data')data={start,size};
off=start+size+(size&1);
}
if(!fmt||!data||fmt.format!==3||fmt.bits!==32||fmt.rate!==FS||(fmt.channels!==2&&fmt.channels!==4)||fmt.align!==fmt.channels*4||data.size%(fmt.channels*4))throw Error('Preview requires 2- or 4-channel float32 IRS at 48 kHz');
const frames=data.size/(fmt.channels*4),samples=Array.from({length:fmt.channels},()=>new Float32Array(frames));
for(let i=0;i<frames;i++)for(let ch=0;ch<fmt.channels;ch++)samples[ch][i]=v.getFloat32(data.start+(i*fmt.channels+ch)*4,true);
return{channels:fmt.channels,frames,samples};
}

function parseVdc(text){
const m=text.trim().split(/\r?\n/).map(line=>/^SR_(\d+):\s*(.+)$/.exec(line.trim()));
const row=m.find(q=>q&&+q[1]===FS);
if(!row)throw Error('48 kHz VDC coefficients unavailable');
const values=row[2].split(',').map(Number);
if(!values.length||values.length%5||values.some(x=>!Number.isFinite(x)))throw Error('VDC coefficient data invalid');
const sections=[];
for(let i=0;i<values.length;i+=5){
const [b0,b1,b2,a1,a2]=values.slice(i,i+5),disc=a1*a1+4*a2;
const radius=disc>=0?Math.max(Math.abs((a1+Math.sqrt(disc))/2),Math.abs((a1-Math.sqrt(disc))/2)):Math.sqrt(Math.max(0,-a2));
if(radius>=1)throw Error('VDC contains an unstable biquad section');
sections.push({b0,b1,b2,a1,a2,radius});
}
return sections;
}

function vdcMagnitude(sections,f){
let mag=1;
const w=2*PI*f/FS,c=Math.cos(w),s=-Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
for(const q of sections){
const nr=q.b0+q.b1*c+q.b2*c2,ni=q.b1*s+q.b2*s2,dr=1-q.a1*c-q.a2*c2,di=-q.a1*s-q.a2*s2;
mag*=Math.hypot(nr,ni)/Math.max(1e-12,Math.hypot(dr,di));
}
return mag;
}

async function loadProfile(p){
if(!p)return;
profile=p;
try{
const [ir,vdc]=await Promise.all([fetch(p.irs).then(r=>{if(!r.ok)throw Error('IRS could not be loaded');return r.arrayBuffer();}),fetch(p.vdc).then(r=>{if(!r.ok)throw Error('VDC could not be loaded');return r.text();})]);
assets={irs:parseWav(ir),vdc:parseVdc(vdc),name:p.name};
el.play.disabled=false;
const kind=assets.irs.channels===4?'4-channel true stereo':'2-channel stereo';
el.plotLabel.textContent=`${p.name} · ${assets.vdc.length} VDC stages · ${kind}`;
drawPlot();
status(`${p.name} assets ready. Start playback to create the 48 kHz audio engine.`);
}catch(e){assets=null;status('Compare unavailable: '+e.message);el.play.disabled=true;}
}

function makeImpulse(ctx){
const ir=assets.irs,b=ctx.createBuffer(ir.channels,ir.frames,FS);
for(let ch=0;ch<ir.channels;ch++)b.copyToChannel(ir.samples[ch],ch);
return b;
}

function connectChain(ctx,input,options){
let node=input;
if(options.vdc){
for(const q of assets.vdc){
const f=ctx.createIIRFilter([q.b0,q.b1,q.b2],[1,-q.a1,-q.a2]);
node.connect(f);
node=f;
}
}
if(options.irs){
const convolver=ctx.createConvolver();
convolver.normalize=false;
convolver.buffer=makeImpulse(ctx);
node.connect(convolver);
node=convolver;
}
return node;
}

function stereoBuffer(ctx,source){
const out=ctx.createBuffer(2,source.length,FS);
const left=source.getChannelData(0),right=source.numberOfChannels>1?source.getChannelData(1):left;
out.copyToChannel(left,0);
out.copyToChannel(right,1);
return out;
}

async function levelMatch(buffer,options){
if(!options.vdc&&!options.irs)return 0;
if(!window.OfflineAudioContext&&!window.webkitOfflineAudioContext)return 0;
const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext,frames=Math.min(buffer.length,FS*5),clip=new Offline(2,frames,FS),copy=clip.createBuffer(2,frames,FS);
for(let ch=0;ch<2;ch++)copy.copyToChannel(buffer.getChannelData(ch).slice(0,frames),ch);
const src=clip.createBufferSource();src.buffer=copy;
const end=connectChain(clip,src,options);
end.connect(clip.destination);
src.start(0);
const rendered=await clip.startRendering();
let input=0,output=0,count=frames*2;
for(let ch=0;ch<2;ch++){
const a=copy.getChannelData(ch),b=rendered.getChannelData(ch);
for(let i=0;i<frames;i++){input+=a[i]*a[i];output+=b[i]*b[i];}
}
const rmsIn=Math.sqrt(input/count),rmsOut=Math.sqrt(output/count);
return clamp(db(rmsIn/Math.max(1e-12,rmsOut)),-12,3);
}

function ensureContext(){
if(context)return context;
const Audio=window.AudioContext||window.webkitAudioContext;
if(!Audio)throw Error('Web Audio is not supported in this browser');
try{context=new Audio({sampleRate:FS,latencyHint:'interactive'});}catch{context=new Audio();}
if(context.sampleRate!==FS){const rate=context.sampleRate;context.close();context=null;throw Error('This browser created a '+rate+' Hz audio context; 48 kHz is required for this preview.');}
return context;
}

function createTestBuffer(ctx,type){
const seconds=type==='left'||type==='right'?4:8,frames=seconds*FS,b=ctx.createBuffer(2,frames,FS),l=b.getChannelData(0),r=b.getChannelData(1);
if(type==='left'||type==='right'){
const target=type==='left'?l:r;
for(let i=0;i<frames;i++)target[i]=.18*Math.sin(2*PI*440*i/FS);
return b;
}
if(type==='sweep'){
let phase=0;
for(let i=0;i<frames;i++){
const t=i/frames,f=20*Math.pow(1000,t),fade=Math.min(1,i/(FS*.05),(frames-i)/(FS*.1));
phase+=2*PI*f/FS;
const value=.18*Math.sin(phase)*fade;
l[i]=value;r[i]=value;
}
return b;
}
let states=()=>({b0:0,b1:0,b2:0,b3:0,b4:0,b5:0,b6:0});
const pinkL=states(),pinkR=states();
const sample=s=>{
const w=Math.random()*2-1;
s.b0=.99886*s.b0+w*.0555179;
s.b1=.99332*s.b1+w*.0750759;
s.b2=.96900*s.b2+w*.1538520;
s.b3=.86650*s.b3+w*.3104856;
s.b4=.55*s.b4+w*.5329520;
s.b5=-.7616*s.b5-w*.0168980;
const p=s.b0+s.b1+s.b2+s.b3+s.b4+s.b5+s.b6+w*.5362;
s.b6=w*.115926;
return p*.07;
};
for(let i=0;i<frames;i++){l[i]=sample(pinkL);r[i]=sample(pinkR);}
return b;
}

async function selectedBuffer(ctx){
if(customBuffer)return stereoBuffer(ctx,customBuffer);
if(sourceBuffer&&sourceBuffer.key===el.source.value)return stereoBuffer(ctx,sourceBuffer.buffer);
const buffer=createTestBuffer(ctx,el.source.value);
sourceBuffer={key:el.source.value,buffer};
return buffer;
}

function setActive(which){
active=which;
if(gates.length){
const now=context.currentTime;
gates[0].gain.setTargetAtTime(which==='a'?1:0,now,.012);
gates[1].gain.setTargetAtTime(which==='b'?1:0,now,.012);
}
el.a.setAttribute('aria-pressed',which==='a');
el.b.setAttribute('aria-pressed',which==='b');
}

function releaseSources(){
for(const src of sourceNodes){try{src.stop();}catch{}}
sourceNodes=[];
gates=[];
}

async function play(){
if(playing)return;
if(!assets){status('Profile files are still loading.');return;}
try{
const ctx=ensureContext();
await ctx.resume();
const buffer=await selectedBuffer(ctx),options={vdc:el.vdc.checked,irs:el.irs.checked};
status('Level matching the first five seconds…');
matchDb=await levelMatch(buffer,options);
releaseSources();
const masterPad=Math.pow(10,-12/20),makeBranch=which=>{
const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;
let node=src;
if(which==='b')node=connectChain(ctx,src,options);
const level=ctx.createGain();level.gain.value=masterPad*(which==='b'?Math.pow(10,matchDb/20):1);
const gate=ctx.createGain();gate.gain.value=(active===which)?1:0;
node.connect(level);level.connect(gate);gate.connect(ctx.destination);
src.start(ctx.currentTime+.025,offset);
sourceNodes.push(src);gates.push(gate);
};
makeBranch('a');makeBranch('b');
startedAt=ctx.currentTime+.025;
playing=true;
el.play.disabled=true;el.pause.disabled=false;el.stop.disabled=false;
el.x.disabled=false;
status(`Playing ${profile.name} · B level match ${matchDb>=0?'+':''}${matchDb.toFixed(2)} dB · −12 dB safety pad.`);
}catch(e){status('Preview could not start: '+e.message);}
}

function pause(){
if(!playing||!context)return;
offset=(offset+Math.max(0,context.currentTime-startedAt))%(sourceNodes[0]?.buffer?.duration||1);
releaseSources();
playing=false;
el.play.disabled=false;el.pause.disabled=true;
status('Paused. Resume to continue the same source position.');
}

function stop(){
releaseSources();
playing=false;offset=0;
el.play.disabled=!assets;el.pause.disabled=true;el.stop.disabled=true;el.x.disabled=true;
trial=null;guess=null;
el.guessA.disabled=true;el.guessB.disabled=true;el.reveal.disabled=true;
status('Stopped.');
}

function renderPlotGrid(){
el.plotGrid.replaceChildren();
const yTicks=[-24,-12,0,12],xTicks=[20,50,100,200,500,1000,2000,5000,10000,20000],W=760,H=220,m={l:48,r:14,t:18,b:32},yMin=-30,yMax=15;
const X=f=>m.l+Math.log10(f/20)/3*(W-m.l-m.r),Y=v=>m.t+(yMax-v)/(yMax-yMin)*(H-m.t-m.b);
yTicks.forEach(v=>{
const y=Y(v);
make('line',{x1:m.l,x2:W-m.r,y1:y,y2:y,class:'cmp-grid-line'+(v===0?' zero':'')},el.plotGrid);
const t=make('text',{x:m.l-8,y:y+4,'text-anchor':'end',class:'cmp-axis'},el.plotGrid);t.textContent=v+' dB';
});
xTicks.forEach(v=>{
const x=X(v);
make('line',{x1:x,x2:x,y1:m.t,y2:H-m.b,class:'cmp-grid-line'},el.plotGrid);
const t=make('text',{x,y:H-9,'text-anchor':'middle',class:'cmp-axis'},el.plotGrid);t.textContent=v>=1000?v/1000+'k':String(v);
});
return{X,Y,m,W,H,yMin,yMax};
}

function drawPlot(){
if(!assets)return;
const g=renderPlotGrid(),ir=assets.irs,diag=ir.channels===4?[0,3]:[0,1],freqs=Array.from({length:180},(_,i)=>20*Math.pow(1000,i/179)),points=[];
for(const f of freqs){
let magnitude=0;
if(el.irs.checked){
const w=2*PI*f/FS;
for(const ch of diag){
let re=0,im=0;
const h=ir.samples[ch];
for(let i=0;i<h.length;i++){const a=w*i;re+=h[i]*Math.cos(a);im-=h[i]*Math.sin(a);}
magnitude+=Math.hypot(re,im)**2/diag.length;
}
magnitude=Math.sqrt(magnitude);
}else magnitude=1;
if(el.vdc.checked)magnitude*=vdcMagnitude(assets.vdc,f);
const val=clamp(db(magnitude),g.yMin,g.yMax);
points.push([g.X(f),g.Y(val)]);
}
el.plot.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(''));
el.plotLabel.textContent=`${profile.name} · ${el.vdc.checked?'VDC':'VDC bypass'} + ${el.irs.checked?'IRS':'IRS bypass'} · direct-path average`;
}

function blindStart(){
if(!playing){status('Start playback before beginning a blind trial.');return;}
trial=Math.random()<.5?'a':'b';guess=null;
setActive(trial);
el.guessA.disabled=false;el.guessB.disabled=false;el.reveal.disabled=true;
status('X is playing. Listen, then choose whether it matches A or B.');
}

function chooseGuess(value){
if(!trial)return;
guess=value;
el.reveal.disabled=false;
status('Guess recorded. Reveal the hidden chain when ready.');
}

function reveal(){
if(!trial||!guess)return;
trials++;
const hit=guess===trial;
if(hit)correct++;
el.score.textContent=`Trials ${trials} · Correct ${correct} · ${Math.round(correct/trials*100)}%`;
status(`X was ${trial.toUpperCase()} · ${hit?'correct guess':'not this time'}. Start another X trial to continue.`);
trial=null;guess=null;
el.guessA.disabled=true;el.guessB.disabled=true;el.reveal.disabled=true;
setActive('a');
}

el.play.addEventListener('click',play);
el.pause.addEventListener('click',pause);
el.stop.addEventListener('click',stop);
el.a.addEventListener('click',()=>setActive('a'));
el.b.addEventListener('click',()=>setActive('b'));
el.x.addEventListener('click',blindStart);
el.guessA.addEventListener('click',()=>chooseGuess('a'));
el.guessB.addEventListener('click',()=>chooseGuess('b'));
el.reveal.addEventListener('click',reveal);
el.vdc.addEventListener('change',()=>{drawPlot();if(playing){pause();status('Filter selection changed. Press Play to rebuild the chain.');}});
el.irs.addEventListener('change',()=>{drawPlot();if(playing){pause();status('Filter selection changed. Press Play to rebuild the chain.');}});
el.source.addEventListener('change',()=>{customBuffer=null;sourceBuffer=null;offset=0;status('Source selected. Press Play to load it.');});
el.file.addEventListener('change',async()=>{
const f=el.file.files?.[0];
if(!f)return;
if(f.size>40*1024*1024){status('Audio file exceeds the 40 MB preview limit.');el.file.value='';return;}
try{
const ctx=ensureContext();
await ctx.resume();
const decoded=await ctx.decodeAudioData(await f.arrayBuffer());
if(decoded.duration>600)throw Error('Audio file is longer than the 10-minute preview limit');
customBuffer=decoded;sourceBuffer=null;offset=0;
status(`Loaded ${f.name} · ${decoded.numberOfChannels} channels · ${decoded.duration.toFixed(1)} s.`);
}catch(e){status('Audio file could not be loaded: '+e.message);customBuffer=null;}
});
window.addEventListener('ha:profilechange',e=>{
if(playing)stop();
loadProfile(e.detail?.profile||window.HAProfiles?.current());
});
window.addEventListener('resize',()=>drawPlot());
loadProfile(window.HAProfiles?.current());
})();
