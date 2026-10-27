/* Fotografías oficiales compartidas de Fiiller Café. Requiere sesión de personal admin. */
(() => {
  "use strict";
  const section=document.createElement("section");
  section.className="card";
  section.style.marginTop="18px";
  section.innerHTML='<h2>Fotografías públicas de los productos</h2><p class="edit-hint">Las fotos publicadas aquí aparecen en el menú de todos los celulares y computadoras. Solo el administrador puede subirlas. No cambia precios ni existencias.</p><div id="shared-photos-alert" class="menu-feedback" role="status" aria-live="polite" hidden></div><div id="shared-photos-body"><p class="muted">Cargando catálogo compartido…</p></div>';
  document.querySelector("#extras-control")?.before(section);
  if(!section.isConnected)document.querySelector("main")?.append(section);
  const body=section.querySelector("#shared-photos-body");
  const alert=section.querySelector("#shared-photos-alert");
  const notify=(msg,error=false)=>{alert.textContent=msg;alert.classList.toggle("error",error);alert.hidden=false;};
  const escape=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  let busy=false;

  async function jpeg(file){
    if(!file || !["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Selecciona un archivo JPG, PNG o WebP.");
    if(file.size>25*1024*1024)throw Error("La imagen original no puede superar 25 MB.");
    const url=URL.createObjectURL(file);
    try{
      const photo=new Image();
      await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=()=>reject(Error("No se pudo abrir la imagen."));photo.src=url;});
      const canvas=document.createElement("canvas");
      const ratio=Math.min(1,1000/Math.max(photo.naturalWidth,photo.naturalHeight));
      canvas.width=Math.max(1,Math.round(photo.naturalWidth*ratio));
      canvas.height=Math.max(1,Math.round(photo.naturalHeight*ratio));
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("No se pudo procesar la imagen.");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(photo,0,0,canvas.width,canvas.height);
      return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("No se pudo comprimir la foto.")),"image/jpeg",0.80));
    }finally{URL.revokeObjectURL(url);}
  }
  async function render(){
    if((await FillerCloud.staffRole())!=="admin"){
      body.innerHTML='<div class="edit-hint">Inicia sesión con tu cuenta de <strong>administrador</strong> para publicar fotografías en todos los dispositivos.</div><form id="shared-photo-login" class="form"><label>Usuario<input name="user" autocomplete="username" value="admin" required></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Entrar para subir fotos</button></form>';
      body.querySelector("form").addEventListener("submit",async ev=>{
        ev.preventDefault();const b=ev.currentTarget.querySelector("button");b.disabled=true;
        try{await FillerCloud.login(ev.currentTarget.elements.user.value,ev.currentTarget.elements.password.value);await render();notify("Acceso autorizado. Ya puedes subir fotografías oficiales.");}
        catch(error){notify(error.message,true);}finally{b.disabled=false;}
      });
      return;
    }
    const rows=await FillerCloud.catalog();
    const covered=rows.filter(row=>!!row.image).length;
    body.innerHTML='<p class="edit-hint"><strong>'+covered+' de '+rows.length+' productos</strong> tienen foto compartida. Si ya tienes una fotografía guardada en esta computadora, selecciónala nuevamente aquí para publicarla.</p><div id="shared-photo-list"></div>';
    const list=body.querySelector("#shared-photo-list");
    rows.forEach(row=>{
      const line=document.createElement("div");line.className="line item-line";
      const pic=document.createElement("img");pic.className="thumb";pic.alt="Foto de "+row.name;pic.loading="lazy";
      pic.src=row.image||"./assets/filler-logo-oficial.webp";
      pic.addEventListener("error",()=>{
        pic.onerror=null;
        if(!pic.src.endsWith("/assets/filler-logo-oficial.webp"))
          pic.src="./assets/filler-logo-oficial.webp";
      },{once:true});
      const area=document.createElement("div");
      const heading=document.createElement("strong");heading.textContent=row.name;
      const state=document.createElement("div");state.className="muted";state.style.fontSize="12px";state.textContent=row.image?"Foto publicada ✓":"Sin foto pública";
      const field=document.createElement("input");field.type="file";field.accept="image/jpeg,image/png,image/webp";field.setAttribute("aria-label","Publicar fotografía de "+row.name);field.style.marginTop="7px";
      field.addEventListener("change",async()=>{
        const file=field.files?.[0];if(!file||busy)return;busy=true;field.disabled=true;notify("Preparando fotografía de "+row.name+"…");
        try{
          const blob=await jpeg(file);
          await FillerCloud.uploadProductPhoto(row.id,blob);
          notify("✓ Fotografía de "+row.name+" publicada. Aparecerá en el menú de todos los dispositivos.");
          await render();
        }catch(error){notify("No se publicó la foto: "+error.message,true);field.disabled=false;}
        finally{busy=false;}
      });
      area.append(heading,state,field);line.append(pic,area);list.append(line);
    });
    if(!rows.length)body.textContent="Todavía no hay productos activos en el catálogo compartido.";
  }
  render().catch(error=>notify("No se pudo cargar el catálogo: "+error.message,true));
})();