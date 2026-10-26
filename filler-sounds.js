/* Firma sonora original de Filler Café.
 * Tonos sintetizados localmente por Web Audio. No se usa contenido de terceros.
 * Solo funcionan en una página abierta tras una interacción que autorice audio.
 */
(() => {
  "use strict";
  const frequencies=Object.freeze({
    C5:523.25,E5:659.25,G5:783.99,C6:1046.50,
    D5:587.33,A5:880.00,B5:987.77
  });
  // Motivo de marca "Filler": do-mi-sol-do; mismo ADN en los tres avisos.
  const motifs=Object.freeze({
    brand:[["C5",0,.22],["E5",.27,.22],["G5",.54,.24],["C6",.86,.52]],
    newOrder:[
      ["C5",0,.17],["E5",.21,.17],["G5",.42,.20],["C6",.69,.34],
      ["C5",1.30,.17],["E5",1.51,.17],["G5",1.72,.20],["C6",2.00,.40]
    ],
    ready:[["C5",0,.20],["E5",.25,.22],["G5",.54,.28],["C6",.90,.52]],
    message:[["E5",0,.23],["G5",.30,.36]]
  });
  const levels=Object.freeze({normal:.18,alto:.30,max:.45});
  function play(context,kind="brand",volume="alto"){
    if(!context||context.state!=="running")return false;
    const notes=motifs[kind]||motifs.brand;
    const loudness=typeof volume==="number"?
      Math.max(.025,Math.min(.55,volume)):(levels[volume]||levels.alto);
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12,context.currentTime);
    compressor.knee.setValueAtTime(12,context.currentTime);
    compressor.ratio.setValueAtTime(3.5,context.currentTime);
    compressor.attack.setValueAtTime(.005,context.currentTime);
    compressor.release.setValueAtTime(.16,context.currentTime);
    compressor.connect(context.destination);
    let pending=notes.length;
    for(const [pitch,shift,duration] of notes){
      const start=context.currentTime+.025+shift;
      const primary=context.createOscillator();
      const overtone=context.createOscillator();
      const overGain=context.createGain();
      const envelope=context.createGain();
      primary.type="triangle";
      primary.frequency.setValueAtTime(frequencies[pitch],start);
      overtone.type="sine";
      overtone.frequency.setValueAtTime(frequencies[pitch]*2,start);
      overGain.gain.setValueAtTime(.13,start);
      envelope.gain.setValueAtTime(.001,start);
      envelope.gain.linearRampToValueAtTime(loudness,start+.016);
      envelope.gain.setValueAtTime(loudness*.65,start+duration*.55);
      envelope.gain.exponentialRampToValueAtTime(.001,start+duration);
      primary.connect(envelope);
      overtone.connect(overGain);
      overGain.connect(envelope);
      envelope.connect(compressor);
      primary.start(start);overtone.start(start);
      primary.stop(start+duration+.02);overtone.stop(start+duration+.02);
      primary.onended=()=>{
        primary.disconnect();overtone.disconnect();overGain.disconnect();envelope.disconnect();
        pending-=1;
        if(pending===0)compressor.disconnect();
      };
    }
    return true;
  }
  window.FillerSounds=Object.freeze({
    play,levels,
    motifs:Object.keys(motifs),
    async preview(kind="brand",volume="alto"){
      const Engine=window.AudioContext||window.webkitAudioContext;
      if(!Engine)throw Error("Este navegador no admite audio Web Audio.");
      // La vista previa debe ejecutarse desde un botón pulsado por la persona.
      const ctx=new Engine();
      try{
        await ctx.resume();
        const ok=play(ctx,kind,volume);
        const seconds=kind==="newOrder"?3.0:kind==="message"?1.2:2.0;
        window.setTimeout(()=>ctx.close().catch(()=>{}),seconds*1000);
        return ok;
      }catch(error){await ctx.close().catch(()=>{});throw error;}
    }
  });
})();
