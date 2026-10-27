/* Fiiller Café — identidad sonora moderna + sonidos personalizados compartidos.
 * Sonidos modernos generados con Web Audio. Audios propios en Supabase Storage;
 * solo administración puede publicarlos. Nada de claves privadas en cliente.
 */
(() => {
  "use strict";
  const API="https://qwxydjotwhniahaovrff.supabase.co";
  const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
  const BUCKET="filler-notification-sounds";
  const KINDS=["newOrder","ready","message"];
  const levels=Object.freeze({normal:.20,alto:.35,max:.48});
  const patterns=Object.freeze({
    newOrder:[[659.25,0,.23],[880.00,.26,.22],[1108.73,.53,.27],[1318.51,.84,.47],
      [659.25,1.56,.19],[880.00,1.81,.20],[1108.73,2.07,.25],[1318.51,2.40,.53]],
    ready:[[659.25,0,.19],[880.00,.22,.22],[1108.73,.49,.30],[1318.51,.84,.60]],
    message:[[880.00,0,.20],[1108.73,.26,.41]],
    brand:[[659.25,0,.20],[880.00,.27,.23],[1108.73,.55,.28],[1318.51,.91,.65]]
  });
  const configs=Object.fromEntries(KINDS.map(k=>[k,{kind:k,mode:"modern",object_path:null}]));
  const decoded=new WeakMap();
  const validPath=/^(newOrder|ready|message)\/[a-f0-9-]{36}\.(mp3|wav|ogg|m4a)$/;
  let loadedAt=0, fetching=null;
  const loudness=value=>typeof value==="number"?
    Math.min(.55,Math.max(.03,value)):levels[value]||levels.alto;
  const sourceUrl=path=>API+"/storage/v1/object/public/"+BUCKET+"/"+path;
  async function loadConfig(force=false){
    if(!force&&Date.now()-loadedAt<90000)return configs;
    if(fetching&&!force)return fetching;
    const promise=(async()=>{
      const response=await fetch(API+"/rest/v1/filler_sound_settings?select=kind,mode,object_path,updated_at",{
        headers:{"apikey":KEY,"accept":"application/json"},cache:"no-store"
      });
      if(!response.ok)throw Error("No se pudo consultar la configuración de audio.");
      const rows=await response.json();
      if(!Array.isArray(rows))throw Error("Respuesta de configuración inesperada.");
      for(const k of KINDS)configs[k]={kind:k,mode:"modern",object_path:null};
      for(const r of rows){
        if(!KINDS.includes(r.kind))continue;
        if(r.mode==="custom"&&typeof r.object_path==="string"&&
          validPath.test(r.object_path)&&r.object_path.startsWith(r.kind+"/"))
          configs[r.kind]={kind:r.kind,mode:"custom",object_path:r.object_path,updated_at:r.updated_at};
      }
      loadedAt=Date.now();
      return configs;
    })();
    fetching=promise;
    try{return await promise}finally{if(fetching===promise)fetching=null;}
  }
  async function prepare(context,{force=false}={}){
    if(!context||context.state==="closed")return;
    try{await loadConfig(force)}catch{ /* Mantener tono moderno aun sin red */ }
    if(!decoded.has(context))decoded.set(context,new Map());
    const cache=decoded.get(context);
    await Promise.all(KINDS.map(async kind=>{
      const cfg=configs[kind];
      if(cfg.mode!=="custom"){cache.delete(kind);return;}
      if(cache.get(kind)?.path===cfg.object_path)return;
      try{
        const response=await fetch(sourceUrl(cfg.object_path),{cache:"force-cache"});
        if(!response.ok)throw Error("No se encontró el audio configurado.");
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength>3145728||bytes.byteLength===0)throw Error("Archivo inválido.");
        const buffer=await context.decodeAudioData(bytes);
        if(buffer.duration<.2||buffer.duration>12)throw Error("Duración no admitida.");
        // Si hubo un cambio concurrente, no guardar la versión anterior.
        if(configs[kind].object_path===cfg.object_path)
          cache.set(kind,{path:cfg.object_path,buffer});
      }catch{cache.delete(kind);}
    }));
  }
  function synthesise(context,kind,volume){
    const notes=patterns[kind]||patterns.brand;
    const gainValue=loudness(volume);
    // Ecualización cálida, ataque brillante y eco muy sutil tipo interfaz premium.
    const output=context.createGain();output.gain.value=.8;
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-15;compressor.knee.value=12;
    compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.13;
    const delay=context.createDelay(.4);delay.delayTime.value=.125;
    const feedback=context.createGain();feedback.gain.value=.13;
    const echoTone=context.createBiquadFilter();echoTone.type="lowpass";echoTone.frequency.value=2400;
    const echoReturn=context.createGain();echoReturn.gain.value=.20;
    output.connect(compressor);
    output.connect(delay);delay.connect(echoTone);echoTone.connect(feedback);feedback.connect(delay);
    echoTone.connect(echoReturn);echoReturn.connect(compressor);
    compressor.connect(context.destination);
    let waiting=notes.length;
    for(const [freq,shift,duration] of notes){
      const at=context.currentTime+.03+shift;
      const partials=[
        {type:"sine",multiple:1,amp:1},
        {type:"triangle",multiple:2,amp:.13},
        {type:"sine",multiple:3,amp:.035}
      ];
      const envelope=context.createGain();
      envelope.gain.setValueAtTime(.0001,at);
      envelope.gain.exponentialRampToValueAtTime(Math.max(.01,gainValue),at+.018);
      envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gainValue*.25),at+duration*.63);
      envelope.gain.exponentialRampToValueAtTime(.0001,at+duration+.13);
      envelope.connect(output);
      let remaining=partials.length;
      for(const p of partials){
        const oscillator=context.createOscillator();
        const amp=context.createGain();amp.gain.value=p.amp;
        oscillator.type=p.type;oscillator.frequency.setValueAtTime(freq*p.multiple,at);
        oscillator.connect(amp);amp.connect(envelope);
        oscillator.start(at);oscillator.stop(at+duration+.16);
        oscillator.onended=()=>{
          oscillator.disconnect();amp.disconnect();
          remaining--;
          if(remaining===0){
            envelope.disconnect();waiting--;
            if(waiting===0)window.setTimeout(()=>{
              try{output.disconnect();delay.disconnect();echoTone.disconnect();feedback.disconnect();echoReturn.disconnect();compressor.disconnect();}
              catch{}
            },550);
          }
        };
      }
    }
    return true;
  }
  function play(context,kind="brand",volume="alto",options={}){
    if(!context||context.state!=="running")return false;
    if(!options.modernOnly&&KINDS.includes(kind)&&configs[kind]?.mode==="custom"){
      const cached=decoded.get(context)?.get(kind);
      if(cached?.path===configs[kind].object_path){
        const player=context.createBufferSource();
        const output=context.createGain();
        player.buffer=cached.buffer;output.gain.value=loudness(volume)*1.5;
        player.connect(output);output.connect(context.destination);
        player.start();
        player.onended=()=>{player.disconnect();output.disconnect();};
        return true;
      }
    }
    return synthesise(context,kind,volume);
  }
  async function preview(kind="brand",volume="alto",{modernOnly=false}={}){
    const Engine=window.AudioContext||window.webkitAudioContext;
    if(!Engine)throw Error("Este dispositivo no admite audio.");
    const ctx=new Engine();
    try{
      await ctx.resume();
      if(!modernOnly)await prepare(ctx,{force:true});
      const worked=play(ctx,kind,volume,{modernOnly});
      if(!worked)throw Error("El navegador no permitió reproducir el sonido.");
      const duration=modernOnly?kind==="newOrder"?4:2:decoded.get(ctx)?.get(kind)?.buffer?.duration||4;
      window.setTimeout(()=>ctx.close().catch(()=>{}),Math.min(14000,(duration+1.5)*1000));
      return true;
    }catch(error){await ctx.close().catch(()=>{});throw error;}
  }
  async function previewFile(file,volume="alto"){
    const Engine=window.AudioContext||window.webkitAudioContext;
    if(!Engine)throw Error("Este dispositivo no admite audio.");
    const ctx=new Engine();
    try{
      await ctx.resume();
      const data=await file.arrayBuffer();
      const buffer=await ctx.decodeAudioData(data);
      if(buffer.duration<.2||buffer.duration>12)throw Error("Selecciona un audio de 0.2 a 12 segundos.");
      const node=ctx.createBufferSource();node.buffer=buffer;
      const gain=ctx.createGain();gain.gain.value=loudness(volume)*1.5;
      node.connect(gain);gain.connect(ctx.destination);node.start();
      node.onended=()=>{node.disconnect();gain.disconnect();ctx.close().catch(()=>{});};
      return buffer.duration;
    }catch(error){await ctx.close().catch(()=>{});throw error;}
  }
  function state(kind){
    return {...(configs[kind]||{kind,mode:"modern",object_path:null})};
  }
  window.FillerSounds=Object.freeze({
    play,preview,prepare,previewFile,state,levels,motifs:KINDS.slice(),
    reload:()=>loadConfig(true)
  });
  // Consultar configuración al abrir, sin reproducir nada automáticamente.
  loadConfig().catch(()=>{});
})();
