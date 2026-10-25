(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const img = document.querySelector('#painting');
  const water = document.querySelector('#water');
  const light = document.querySelector('#light');
  const wc = water.getContext('2d');
  const lc = light.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.querySelector('#pause');
  const sound = document.querySelector('#sound');
  const announce = document.querySelector('#announcement');
  const W = 1536, H = 1024;
  // Artwork coordinates: the light remains attached to the painted lantern at every size.
  const lamp = { x: 956, y: 303 };
  const foot = { x: 957, y: 483 };
  let width = 0, height = 0, scale = 1, ox = 0, oy = 0, dpr = 1;
  let running = !reduced.matches, night = false, ready = false;
  let elapsed = 0, lastTime = 0, lastDraw = 0, raf = 0;
  let audioContext, master, surfGain, soundEnabled = false;
  const rand = (seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; })(714);
  const flecks = Array.from({ length: 130 }, () => ({ x: 640 + rand()*910, y: rand()*1024, length: 3+rand()*15, phase: rand()*Math.PI*2, speed: .4+rand()*.8 }));
  const sea = new Path2D('M580 0H1536V1024H910C885 900 870 793 835 711C810 654 815 615 839 587C870 565 895 570 921 578C1000 580 1080 540 1100 493L1100 420L1074 408L1029 416L1012 439L993 442L991 334L995 316L985 290L981 263L956 232L932 264L928 289L914 312L916 338L921 442L891 449L872 468L838 486L805 493C750 435 710 347 680 281C642 211 618 150 608 94Z');
  const tower = new Path2D('M914 325L916 345L925 354L919 470Q921 492 953 497Q982 495 990 477L985 348L996 335L996 318L983 326L957 336L930 333Z');
  const roof = new Path2D('M926 290Q924 270 944 255L955 238L964 255Q985 268 987 289Q955 303 926 290Z');

  function resize() {
    width = innerWidth; height = scene.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const mobile = width < 601;
    scale = Math.max(width / W, height / H) * (mobile ? 1.4 : 1);
    // Keep the lighthouse in view rather than cropping the center blindly on phones.
    ox = mobile ? Math.max(width-W*scale, Math.min(0, width*.67-lamp.x*scale)) : (width-W*scale)/2;
    oy = mobile ? Math.min(0, height*.47-lamp.y*scale) : (height-H*scale)/2;
    img.style.width = `${W*scale}px`; img.style.height = `${H*scale}px`;
    img.style.left = `${ox}px`; img.style.top = `${oy}px`;
    [water,light].forEach(c => { c.width = Math.round(width*dpr); c.height = Math.round(height*dpr); });
    if (ready) render();
  }
  function sourceTransform(ctx) {
    ctx.setTransform(dpr*scale, 0, 0, dpr*scale, dpr*ox, dpr*oy);
  }
  function clear(ctx, canvas) { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); }

  function drawWater() {
    clear(wc,water); sourceTransform(wc); wc.save(); wc.clip(sea);
    // Thin strips of the original painted water move independently. The brushwork is preserved.
    const band = 10;
    for (let y=0; y<H; y+=band) {
      const shift = Math.sin(elapsed*.7+y*.037)*1.45 + Math.sin(elapsed*.38+y*.09)*.55;
      wc.drawImage(img, 0,y,W,Math.min(band,H-y),shift,y,W,Math.min(band,H-y));
    }
    wc.globalCompositeOperation = 'screen';
    for (const f of flecks) {
      const pulse = Math.pow(Math.max(0,Math.sin(elapsed*f.speed+f.phase)),5);
      if(pulse<.07)continue;
      wc.strokeStyle=`rgba(210,227,201,${pulse*.15})`;
      wc.lineWidth = .7;
      const x=f.x+Math.sin(elapsed*.4+f.phase)*2, y=f.y+Math.cos(elapsed*.5+f.phase)*1.6;
      wc.beginPath();wc.moveTo(x,y);wc.lineTo(x+f.length,y-2);wc.stroke();
    }
    wc.restore();
  }

  function drawLight() {
    clear(lc,light); sourceTransform(lc);
    const theta = elapsed*Math.PI*2/24 - .22;
    const radius = 1500, spread=.125;
    const project = a => ({x:lamp.x+Math.cos(a)*radius,y:foot.y+Math.sin(a)*radius*.53});
    const a=project(theta-spread), b=project(theta+spread), target=project(theta);
    const intensity=night?1.5:1;
    // A soft atmospheric cone, projected onto the same isometric ground plane.
    const glow=lc.createRadialGradient(lamp.x,lamp.y,0,lamp.x,lamp.y,1350);
    glow.addColorStop(0,`rgba(255,225,151,${.37*intensity})`);
    glow.addColorStop(.12,`rgba(255,222,145,${.25*intensity})`);
    glow.addColorStop(.5,`rgba(255,226,161,${.11*intensity})`);
    glow.addColorStop(1,'rgba(255,224,155,0)');
    lc.save();lc.filter='blur(9px)';lc.fillStyle=glow;
    lc.beginPath();lc.moveTo(lamp.x,lamp.y);lc.lineTo(a.x,a.y);lc.lineTo(b.x,b.y);lc.closePath();lc.fill();lc.restore();
    // Reflection glints brighten only where the beam currently crosses painted water.
    lc.save();
    const beamFootprint = new Path2D();
    beamFootprint.moveTo(lamp.x,lamp.y);beamFootprint.lineTo(a.x,a.y);beamFootprint.lineTo(b.x,b.y);beamFootprint.closePath();
    lc.clip(beamFootprint);lc.clip(sea);
    for(const f of flecks) {
      const dx=f.x-lamp.x,dy=f.y-lamp.y;
      const axis=Math.atan2(target.y-lamp.y,target.x-lamp.x);
      const angle=Math.atan2(dy,dx);
      const difference=Math.abs(Math.atan2(Math.sin(angle-axis),Math.cos(angle-axis)));
      const distance=Math.hypot(dx,dy);
      const alpha=Math.max(0,1-difference/.24)*Math.max(0,1-distance/1500)*(.2+.2*Math.sin(elapsed*1.5+f.phase)**2)*intensity;
      lc.strokeStyle=`rgba(255,219,136,${alpha})`;lc.lineWidth=1.25;
      lc.beginPath();lc.moveTo(f.x,f.y);lc.lineTo(f.x+f.length*1.6,f.y-2);lc.stroke();
    }
    lc.restore();
    // Mask the opaque tower and roof so the beam never shines through the masonry.
    lc.save();lc.globalCompositeOperation='destination-out';lc.fill(tower);lc.fill(roof);lc.restore();
    const facing = .65+.35*Math.max(0,Math.sin(theta));
    const halo=lc.createRadialGradient(lamp.x,lamp.y,0,lamp.x,lamp.y,60);
    halo.addColorStop(0,`rgba(255,227,156,${.65*facing})`);halo.addColorStop(.16,`rgba(255,210,113,${.45*facing})`);halo.addColorStop(.45,`rgba(255,210,113,${.08*facing})`);halo.addColorStop(1,'rgba(255,208,113,0)');
    lc.fillStyle=halo;lc.beginPath();lc.arc(lamp.x,lamp.y,60,0,Math.PI*2);lc.fill();
    lc.strokeStyle=`rgba(255,239,185,${.6*facing})`;lc.lineWidth=1.2;
    lc.beginPath();lc.moveTo(lamp.x-22,lamp.y+1);lc.lineTo(lamp.x+22,lamp.y+1);lc.stroke();
    document.documentElement.style.setProperty('--angle',`${theta*180/Math.PI}deg`);
  }
  function render() { if(!ready)return;drawWater();drawLight(); }
  function tick(time) {
    raf=0;
    if(!running||document.hidden||!ready)return;
    if(lastTime)elapsed+=Math.min((time-lastTime)/1000,.1);
    lastTime=time;
    if(time-lastDraw>=1000/30) {
      render(); lastDraw=time;
      if(soundEnabled&&audioContext&&surfGain)surfGain.gain.setTargetAtTime(.11+Math.sin(elapsed*.42)**2*.14,audioContext.currentTime,.3);
    }
    raf=requestAnimationFrame(tick);
  }
  function schedule() { lastTime=0;if(running&&ready&&!document.hidden&&!raf)raf=requestAnimationFrame(tick); }
  function setRunning(value) {
    running=value;pause.setAttribute('aria-pressed',String(!running));
    pause.setAttribute('aria-label',running?'Animation pausieren':'Animation fortsetzen');pause.title=running?'Animation pausieren':'Animation fortsetzen';
    if(!running&&raf){cancelAnimationFrame(raf);raf=0;}
    schedule();
  }
  pause.addEventListener('click',()=>setRunning(!running));
  reduced.addEventListener('change',e=>setRunning(!e.matches));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;if(audioContext&&soundEnabled)audioContext.suspend();}
    else{schedule();if(audioContext&&soundEnabled)audioContext.resume().catch(()=>{});}
  });
  document.querySelectorAll('.mood').forEach(button=>button.addEventListener('click',()=>{
    night=button.dataset.mood==='night';scene.classList.toggle('night',night);
    document.querySelectorAll('.mood').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    render();announce.textContent=night?'Nachtstimmung aktiviert':'Abendlicht aktiviert';
  }));
  function createAudio() {
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw new Error('unsupported');
    audioContext=new Context();master=audioContext.createGain();master.gain.value=0;master.connect(audioContext.destination);
    const buffer=audioContext.createBuffer(1,audioContext.sampleRate*8,audioContext.sampleRate);
    const data=buffer.getChannelData(0);let previous=0;
    for(let i=0;i<data.length;i++){const white=Math.random()*2-1;previous=(previous+.018*white)/1.018;data[i]=previous*4;}
    const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;
    const lowpass=audioContext.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=750;
    const highpass=audioContext.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=110;
    surfGain=audioContext.createGain();surfGain.gain.value=.18;
    source.connect(lowpass);lowpass.connect(highpass);highpass.connect(surfGain);surfGain.connect(master);source.start();
    // A very slow modulation gives soft surf even while the visual animation is paused.
    const lfo=audioContext.createOscillator(), lfoGain=audioContext.createGain();lfo.frequency.value=.075;lfoGain.gain.value=.05;lfo.connect(lfoGain);lfoGain.connect(surfGain.gain);lfo.start();
  }
  sound.addEventListener('click',async()=>{
    try{
      if(!audioContext)createAudio();
      await audioContext.resume();soundEnabled=!soundEnabled;
      master.gain.setTargetAtTime(soundEnabled?.8:0,audioContext.currentTime,.8);
      sound.setAttribute('aria-pressed',String(soundEnabled));
      const label=soundEnabled?'Wasserklang ausschalten':'Wasserklang einschalten';sound.setAttribute('aria-label',label);sound.title=label;
      announce.textContent=soundEnabled?'Wasserklang eingeschaltet':'Wasserklang ausgeschaltet';
    }catch{announce.textContent='Wasserklang ist in diesem Browser nicht verfügbar.';}
  });

  function start(){if(ready)return;ready=true;resize();elapsed=1.5;render();scene.classList.add('loaded');setRunning(running);}
  img.addEventListener('load',start,{once:true});
  img.addEventListener('error',()=>{scene.classList.add('loaded');announce.textContent='Die Malerei konnte nicht geladen werden. Bitte lade die Seite neu.';},{once:true});
  window.addEventListener('resize',resize,{passive:true});
  resize();if(img.complete&&img.naturalWidth)start();
})();
