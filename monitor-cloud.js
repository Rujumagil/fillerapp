/* Filler Café: monitor de cocina con acceso autenticado y actualización automática */
(() => {
  "use strict";
  const root=document.getElementById("orders");
  const clock=document.getElementById("clock");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let role=null;
  const bar=document.createElement("div");
  bar.style.cssText="padding:14px;border:1px solid #497c64;border-radius:14px;margin-bottom:18px;background:#104d38";
  root.before(bar);
  function msg(v){bar.textContent=v;}
  function status(o){
    const now=Date.now(),age=now-o.createdTs,wait=now-o.statusUpdatedAt;
    if(["Nuevo","Preparando"].includes(o.status)&&age>600000)return {card:"late-card",label:"Fuera de tiempo",detail:Math.floor(age/60000)+" min en preparación"};
    if(o.status==="Listo"&&wait>600000)return {card:"late-card",label:"Fuera de tiempo",detail:Math.floor(wait/60000)+" min sin recoger"};
    if(o.status==="Listo")return {card:"ready-card",label:"Listo",detail:"Listo para recoger"};
    if(o.status==="Preparando")return {card:"prep-card",label:"Preparando",detail:"En cocina"};
    return {card:"new-card",label:"Nuevo",detail:"Pendiente de preparación"};
  }
  function login(){
    bar.innerHTML='<form id="monitor-login" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><strong>Acceso al monitor</strong><input name="email" type="email" placeholder="Correo autorizado" required style="padding:10px;border-radius:8px"><input name="password" type="password" placeholder="Contraseña" required style="padding:10px;border-radius:8px"><button type="submit" style="padding:10px">Entrar</button></form>';
    root.innerHTML='<h2>Inicia sesión para ver los pedidos compartidos.</h2>';
    document.getElementById("monitor-login").addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,button=form.querySelector("button");button.disabled=true;
      try{role=(await FillerCloud.login(form.email.value,form.password.value)).role;refresh();}catch(err){msg(err.message);role=null;}
      finally{button.disabled=false;}
    });
  }
  async function refresh(){
    if(!role)return;
    try {
      const orders=(await FillerCloud.orders()).filter(o=>o.status!=="Entregado");
      clock.textContent=new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"});
      root.innerHTML=orders.length?orders.map(o=>{
        const s=status(o);
        const lines=o.items.map(i=>Number(i.qty)+" × "+esc(i.name)+(i.extras?.length?"<br><small>Extras: "+i.extras.map(x=>esc(x.name)).join(", ")+"</small>":"")).join("<br>");
        return '<article class="card '+s.card+'"><span class="badge">'+s.label+'</span><h2>'+esc(o.id)+'</h2><h3>'+esc(o.customer)+'</h3><p class="time">'+s.detail+'</p><p>Recoge: '+esc(o.pickup)+'</p><p>'+lines+'</p></article>';
      }).join(""):'<h2>Sin pedidos activos</h2>';
      bar.innerHTML='<span>🟢 Monitor conectado · Actualizado: '+new Date().toLocaleTimeString("es-MX")+'</span> <button id="monitor-exit" style="margin-left:15px">Salir</button>';
      document.getElementById("monitor-exit").addEventListener("click",()=>{role=null;FillerCloud.logout();login();});
    }catch(err){msg("No se pudo actualizar: "+err.message);}
    if(role)setTimeout(refresh,3000);
  }
  (async()=>{role=await FillerCloud.staffRole();if(role)refresh();else login();})();
})();
