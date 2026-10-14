/* Activa recepción real únicamente cuando el catálogo ya está sincronizado. */
(() => {
  "use strict";
  const banner=document.createElement("div");
  banner.id="filler-online-status";
  banner.style.cssText="padding:12px 15px;margin:-9px 0 18px;border-radius:14px;border:1px solid #bfdcc9;background:#e8f4ea;color:#07583d;font-weight:750";
  const section=document.getElementById("menu");
  section.querySelector(".section-head").after(banner);
  const confirm=document.getElementById("send-order");
  const button=confirm.cloneNode(true);
  button.disabled=true;
  confirm.replaceWith(button);
  let enabled=false, working=false;
  const status=(message,error=false)=>{
    banner.textContent=message;
    banner.style.background=error?"#fff0eb":"#e8f4ea";
    banner.style.color=error?"#953b2c":"#07583d";
  };
  function block(message){enabled=false;window.FillerOnlineActive=false;button.disabled=true;button.textContent="Pedidos en línea aún no disponibles";status(message,true);}
  async function refresh(){
    try {
      const [products,extras]=await Promise.all([FillerCloud.catalog(),FillerCloud.extras()]);
      window.FillerCloudExtras=extras;
      if(!products.length) {block("El menú de la nube aún no está configurado. Estamos preparando los pedidos entre dispositivos.");return;}
      const local=new Map(state.menu.map(i=>[i.id,i]));
      if(state.category!=="Todos"&&!products.some(p=>p.cat===state.category))state.category="Todos";
      state.menu=products.map(i=>({...i,imageKey:local.get(i.id)?.imageKey||"",image:i.image||local.get(i.id)?.image||""}));
      // Revisión de carrito cuando el stock cambia remotamente.
      for(const key of Object.keys(state.cart)){
        const id=key.split("::")[0];
        const product=state.menu.find(x=>x.id===id);
        if(!product){delete state.cart[key];continue;}
        const wanted=Object.entries(state.cart).filter(([k])=>k.split("::")[0]===id).reduce((n,[,qty])=>n+Number(qty),0);
        if(wanted>product.stock)state.cart[key]=Math.max(0,Number(state.cart[key])- (wanted-product.stock));
        if(!state.cart[key])delete state.cart[key];
      }
      window.FillerOnlineActive = true;
      enabled=true;button.disabled=working;button.textContent="Confirmar pedido";
      status("✓ Pedidos conectados a cocina · Menú y existencias sincronizados");
      render();
    }catch(error){block("No se puede comprobar la recepción de pedidos. "+error.message);}
  }
  async function checkout(){
    if(!enabled||working)return;
    const customer=document.getElementById("customer-name").value.trim();
    const phone=document.getElementById("customer-phone").value.trim();
    const items=cartItems();
    if(!items.length)return toast("El pedido está vacío.");
    if(!customer || customer.length<2 || customer.length>90)return toast("Escribe tu nombre completo (máximo 90 caracteres).");
    if(phone.replace(/\D/g,"").length<8 || phone.length>25)return toast("Escribe un teléfono válido.");
    const notes=document.getElementById("notes").value.trim();
    if(notes.length>500)return toast("Las notas deben tener máximo 500 caracteres.");
    working=true;button.disabled=true;button.textContent="Enviando a cocina…";
    try{
      const data=await FillerCloud.placeOrder({
        p_customer:customer,p_phone:phone,p_pickup:document.getElementById("pickup-time").value,
        p_notes:notes,
        p_lines:items.map(i=>({id:i.id,qty:i.qty,extras:(i.extras||[]).map(x=>x.id)}))
      });
      state.cart={};state.extraSelections={};
      render();
      const notice=document.getElementById("client-status");
      notice.textContent="✓ Pedido "+data.code+" recibido en cocina · Total confirmado $"+Number(data.total).toLocaleString("es-MX")+". ";
      if(data.tracking_token && /^[0-9a-f-]{36}$/i.test(data.tracking_token)){
        try{localStorage.setItem("filler_last_tracking_v1",JSON.stringify({token:data.tracking_token,code:data.code}));}catch{}
        const link=document.createElement("a");
        link.href="./pedido.html#token="+encodeURIComponent(data.tracking_token);
        link.textContent="🔔 Seguir mi pedido y saber cuándo está listo";
        link.style.cssText="display:block;margin-top:11px;padding:13px;border-radius:12px;background:#006241;color:white;font-size:15px;font-weight:850;text-decoration:none;text-align:center";
        notice.appendChild(link);
      }else{
        notice.appendChild(document.createTextNode("Solicita a cocina información sobre su preparación."));
      }
      notice.classList.add("show");
      toast("¡Pedido enviado a cocina!");
      // Pedido confirmado: una recarga fallida del catálogo no cambia su recepción.
      refresh().catch(error=>console.warn("No se pudo actualizar la vista después del pedido:",error));
    }catch(error){
      status("No se pudo confirmar el pedido: "+error.message,true);
      toast("Pedido no enviado. "+error.message);
    }finally{working=false;button.disabled=!enabled;button.textContent=enabled?"Confirmar pedido":"Pedidos en línea aún no disponibles";}
  }
  button.addEventListener("click",checkout);
  block("Comprobando conexión segura con cocina…");
  window.FillerCloudModeReady=true;
  // Acceso al último seguimiento incluso después de recargar el menú.
  try{
    const previous=JSON.parse(localStorage.getItem("filler_last_tracking_v1")||"null");
    if(previous?.token&&/^[0-9a-f-]{36}$/i.test(previous.token)){
      const link=document.createElement("a");
      link.href="./pedido.html#token="+encodeURIComponent(previous.token);
      link.textContent="🔔 Consultar estado de mi último pedido ("+String(previous.code||"")+")";
      link.style.cssText="display:block;padding:11px 15px;margin:5px 0 16px;border-radius:12px;border:1px solid #acd7b9;background:#f5fff6;color:#006241;font-weight:750;text-decoration:none";
      banner.after(link);
    }
  }catch{}
  const prev=document.getElementById("client-status");
  if(prev?.textContent?.includes("guardado en este navegador")){prev.textContent="Los pedidos locales anteriores no fueron enviados a cocina. La recepción compartida está en configuración.";}
  refresh();
  setInterval(()=>{if(!working)refresh();},15000);
})();
