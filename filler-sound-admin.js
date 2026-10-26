/* Configuración de audio Filler Café — solo admin, sin credenciales de servicio. */
(()=>{
  "use strict";
  const BASE="https://qwxydjotwhniahaovrff.supabase.co";
  const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
  const BUCKET="filler-notification-sounds";
  const get=id=>document.getElementById(id);
  const cards=[...document.querySelectorAll(".sound-upload-card[data-kind]")];
  const alert=get("sound-admin-notice");
  let busy=false;
  const info=(text,error=false)=>{
    alert.textContent=text;alert.classList.toggle("error",error);alert.hidden=!text;
  };
  function sessionToken(){
    try{
      const account=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
      if(account?.access_token)return account.access_token;
    }catch{}
    throw Error("Tu sesión de administración terminó. Vuelve a iniciar sesión.");
  }
  async function requireAdmin(){
    if((await FillerCloud.staffRole())!=="admin")throw Error("Únicamente el administrador de Filler Café puede editar los sonidos.");
    return sessionToken();
  }
  async function updateSetting(kind,mode,objectPath=null){
    const token=await requireAdmin();
    const response=await fetch(BASE+"/rest/v1/filler_sound_settings?kind=eq."+encodeURIComponent(kind),{
      method:"PATCH",cache:"no-store",
      headers:{
        apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",
        Prefer:"return=representation"
      },
      body:JSON.stringify({mode,object_path:objectPath,updated_at:new Date().toISOString()})
    });
    const rows=await response.json().catch(()=>null);
    if(!response.ok||!Array.isArray(rows)||rows.length!==1)
      throw Error(rows?.message||"No se pudo guardar la configuración del audio.");
  }
  async function uploadAudio(kind,file){
    const token=await requireAdmin();
    const extension=file.name.split(".").pop().toLowerCase();
    const type=extension==="mp3"?"audio/mpeg":extension==="wav"?"audio/wav":"";
    if(!type)throw Error("Solo admitimos MP3 o WAV para máxima compatibilidad.");
    if(!file.size||file.size>3145728)throw Error("El audio debe pesar entre 1 byte y 3 MB.");
    // Validar contenido y duración antes de subirlo.
    const AudioEngine=window.AudioContext||window.webkitAudioContext;
    if(!AudioEngine)throw Error("Este navegador no puede validar archivos de audio.");
    const context=new AudioEngine();
    let duration;
    try{
      const bytes=await file.arrayBuffer();
      const decoded=await context.decodeAudioData(bytes);
      duration=decoded.duration;
    }catch{
      throw Error("No se pudo abrir este audio. Exporta otra vez en MP3 o WAV.");
    }finally{await context.close().catch(()=>{});}
    if(!Number.isFinite(duration)||duration<.2||duration>12)
      throw Error("El audio debe durar entre 0.2 y 12 segundos.");
    const path=kind+"/"+crypto.randomUUID()+"."+extension;
    const uploaded=await fetch(BASE+"/storage/v1/object/"+BUCKET+"/"+path,{
      method:"POST",
      headers:{
        apikey:KEY,Authorization:"Bearer "+token,"Content-Type":type,
        "Cache-Control":"3600", "x-upsert":"false"
      },
      body:file
    });
    if(!uploaded.ok){
      const body=await uploaded.json().catch(()=>({}));
      throw Error(body.message||body.error||"Supabase no pudo guardar el archivo ("+uploaded.status+").");
    }
    await updateSetting(kind,"custom",path);
    await FillerSounds.reload();
    return duration;
  }
  function refreshLabels(){
    for(const card of cards){
      const setting=FillerSounds.state(card.dataset.kind);
      const mode=card.querySelector("[data-mode]");
      const custom=setting.mode==="custom";
      mode.className="sound-mode"+(custom?" custom":"");
      mode.textContent=custom?"✓ Audio propio activado":"✓ Sonido moderno activado";
      card.querySelector("[data-restore]").disabled=!custom;
    }
  }
  async function sync(){
    try{await FillerSounds.reload();refreshLabels();}
    catch(error){info("No se pudo consultar el sonido actual. Puedes probar la versión moderna.",true);}
  }
  async function run(card,fn){
    if(busy)return;
    busy=true;
    const buttons=[...document.querySelectorAll("#sound-admin-editor button")];
    buttons.forEach(b=>b.disabled=true);
    info("");
    try{await fn();}
    catch(error){info(error.message||"Ocurrió un error con el sonido.",true);}
    finally{
      busy=false;
      buttons.forEach(b=>b.disabled=false);
      refreshLabels();
    }
  }
  async function openAdmin(){
    const authorized=(await FillerCloud.staffRole())==="admin";
    get("sound-admin-guest").hidden=authorized;
    get("sound-admin-editor").hidden=!authorized;
    if(authorized)await sync();
  }
  get("sound-admin-login").addEventListener("submit",async ev=>{
    ev.preventDefault();
    const form=ev.currentTarget,button=form.querySelector("button");
    button.disabled=true;info("");
    try{
      const signed=await FillerCloud.login("admin",form.elements.password.value);
      form.elements.password.value="";
      if(signed.role!=="admin")throw Error("La cuenta debe tener permisos de administrador.");
      await openAdmin();
      info("✓ Acceso habilitado. Puedes subir archivos o restaurar el sonido moderno.");
    }catch(error){info(error.message,true);}
    finally{button.disabled=false;}
  });
  for(const card of cards){
    const kind=card.dataset.kind;
    const input=card.querySelector("[data-file]");
    card.querySelector("[data-listen-file]").addEventListener("click",()=>run(card,async()=>{
      const file=input.files?.[0];
      if(!file)throw Error("Primero selecciona un audio MP3 o WAV.");
      const duration=await FillerSounds.previewFile(file,get("filler-sound-level").value);
      info("✓ Reproduciendo tu audio de "+duration.toFixed(1)+" segundos. Aún no se ha publicado.");
    }));
    card.querySelector("[data-publish]").addEventListener("click",()=>run(card,async()=>{
      const file=input.files?.[0];
      if(!file)throw Error("Selecciona un archivo antes de subirlo.");
      if(!confirm("¿Publicar este audio como sonido oficial de "+(kind==="newOrder"?"Nuevo pedido":kind==="ready"?"Pedido listo":"Mensaje de cocina")+" en todos los dispositivos?"))return;
      info("Subiendo el audio y actualizando los equipos…");
      const duration=await uploadAudio(kind,file);
      input.value="";
      info("✓ Sonido propio de "+duration.toFixed(1)+" segundos activado. Los equipos abiertos lo descargarán al actualizar.");
    }));
    card.querySelector("[data-restore]").addEventListener("click",()=>run(card,async()=>{
      if(!confirm("¿Volver al sonido moderno de Filler para este aviso?"))return;
      await updateSetting(kind,"modern",null);
      await FillerSounds.reload();
      info("✓ Sonido moderno restaurado. Se aplicará en los equipos.");
    }));
  }
  openAdmin().catch(error=>info("No se pudo validar la cuenta: "+error.message,true));
})();
