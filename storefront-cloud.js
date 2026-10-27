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
      status("✓ Menú actualizado · Elige tus favoritos y recógelos en Fiiller Café");
      render();
    }catch(error){block("No se puede comprobar la recepción de pedidos. "+error.message);}
  }
  async function loadCustomerAccount(){
    const panel=document.getElementById("customer-account");
    const fields=document.getElementById("customer-fields");
    const name=document.getElementById("customer-name");
    const phone=document.getElementById("customer-phone");
    if(!panel||!fields||!name||!phone)return;
    const guest=()=>{
      panel.textContent="";
      const heading=document.createElement("strong");heading.textContent="☕ Compra sin registrarte";
      const info=document.createElement("p");
      info.textContent="Solo necesitamos tus datos y la hora para recoger.";
      info.style.margin="5px 0";
      const link=document.createElement("a");
      link.href="./mi-filler.html";link.textContent="¿Quieres guardar tus datos? Ir a Mi Fiiller";
      link.style.cssText="display:inline-block;margin-top:2px;color:#006241;text-decoration:underline;text-underline-offset:2px;font-size:12px;font-weight:800";
      panel.append(heading,info,link);
      fields.hidden=false;
    };
    let session;
    try{session=JSON.parse(sessionStorage.getItem("filler_customer_session_v1")||"null");}catch{}
    if(!session?.access_token||!session?.user?.id){guest();return;}
    try{
      // Verificar sesión con Auth antes de mostrar datos. Nunca confiar únicamente en sessionStorage.
      const headers={apikey:"sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3",Authorization:"Bearer "+session.access_token};
      const who=await fetch("https://qwxydjotwhniahaovrff.supabase.co/auth/v1/user",{headers,cache:"no-store"});
      if(!who.ok){guest();return;}
      const user=await who.json();
      if(user.id!==session.user.id){guest();return;}
      const res=await fetch("https://qwxydjotwhniahaovrff.supabase.co/rest/v1/filler_customers?select=full_name,phone&user_id=eq."+encodeURIComponent(user.id),{headers,cache:"no-store"});
      if(!res.ok){guest();return;}
      const rows=await res.json();
      const customer=rows?.[0]||null;
      const displayName=String(customer?.full_name||user.user_metadata?.filler_display_name||"").trim();
      const displayPhone=String(customer?.phone||"").trim();
      if(displayName)name.value=displayName;
      if(displayPhone)phone.value=displayPhone;
      panel.textContent="";
      const heading=document.createElement("strong");
      heading.textContent="✓ ¡Hola"+(displayName?", "+displayName.split(" ")[0]:"")+"! Sesión iniciada";
      const info=document.createElement("p");
      info.style.margin="7px 0";
      info.textContent=displayName&&displayPhone?"Tus datos están guardados. Solo elige cuándo recoger.":"Completa los datos que faltan para confirmar este pedido.";
      const edit=document.createElement("button");
      edit.type="button";edit.className="secondary";edit.textContent="Editar mis datos";
      edit.style.cssText="font-size:13px;padding:8px 12px;margin-top:4px";
      edit.addEventListener("click",()=>{fields.hidden=false;name.focus();});
      const link=document.createElement("a");
      link.href="./mi-filler.html";link.textContent="Mi perfil";
      link.style.cssText="display:inline-block;margin-left:12px;color:#006241;font-weight:750";
      panel.append(heading,info,edit,link);
      fields.hidden=Boolean(displayName&&displayPhone);
    }catch(error){guest();}
  }
  const errorPanel=document.getElementById("filler-checkout-error");
  function clearCheckoutError(){
    if(errorPanel){errorPanel.textContent="";errorPanel.hidden=true;}
    document.querySelectorAll("#filler-cart [aria-invalid='true']").forEach(el=>el.removeAttribute("aria-invalid"));
  }
  function showCheckoutError(message,inputId){
    if(errorPanel){errorPanel.textContent=message;errorPanel.hidden=false;}
    const input=inputId?document.getElementById(inputId):null;
    if(input){
      const fields=document.getElementById("customer-fields");
      if(fields?.hidden)fields.hidden=false;
      input.setAttribute("aria-invalid","true");
      input.scrollIntoView({behavior:"smooth",block:"center"});
      input.focus({preventScroll:true});
    }else if(errorPanel){errorPanel.scrollIntoView({behavior:"smooth",block:"center"});}
    toast(message);
  }
  ["customer-name","customer-phone","pickup-time","pickup-date","notes"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input",clearCheckoutError);
  });
  async function checkout(){
    if(!enabled||working)return;
    clearCheckoutError();
    const customer=document.getElementById("customer-name").value.trim();
    const phone=document.getElementById("customer-phone").value.trim();
    const items=cartItems();
    if(!items.length)return showCheckoutError("Agrega al menos un producto para continuar.");
    if(!customer || customer.length<2 || customer.length>90)return showCheckoutError("Escribe tu nombre completo (máximo 90 caracteres).","customer-name");
    if(phone.replace(/\D/g,"").length<8 || phone.length>25)return showCheckoutError("Escribe un teléfono válido.","customer-phone");
    renderPickupTimes();
    const pickupSelect=document.getElementById("pickup-time");
    if(pickupSelect.disabled || !pickupSelect.value)return showCheckoutError("Selecciona mañana para programar tu pedido, o elige un horario disponible.","pickup-time");
    const notes=document.getElementById("notes").value.trim();
    if(notes.length>500)return showCheckoutError("Las notas deben tener máximo 500 caracteres.","notes");
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
      notice.textContent="✓ Pedido "+data.code+" registrado para recoger el "+pickupSelect.value.replace(" "," a las ")+" h · Total confirmado $"+Number(data.total).toLocaleString("es-MX")+". ";
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
      notice.dataset.confirmed="true";
      notice.classList.add("show");
      const cartPanel=document.getElementById("filler-cart");
      if(document.body.classList.contains("filler-cart-open"))cartPanel.scrollTo({top:0,behavior:"smooth"});
      else notice.scrollIntoView({behavior:"smooth",block:"center"});
      notice.focus({preventScroll:true});
      refreshAlerts();
      toast(document.getElementById("pickup-date")?.value==="tomorrow"?"¡Pedido programado para mañana!":"¡Pedido enviado a cocina!");
      // Pedido confirmado: una recarga fallida del catálogo no cambia su recepción.
      refresh().catch(error=>console.warn("No se pudo actualizar la vista después del pedido:",error));
    }catch(error){
      status("No se pudo confirmar el pedido: "+error.message,true);
      showCheckoutError("El pedido no se envió: "+(error?.message||"Revisa tu conexión e inténtalo de nuevo."));
    }finally{working=false;button.disabled=!enabled;button.textContent=enabled?"Confirmar pedido":"Pedidos en línea aún no disponibles";}
  }
  button.addEventListener("click",checkout);
  block("Comprobando conexión segura con cocina…");
  window.FillerCloudModeReady=true;
  // Centro de avisos: solo muestra el estado obtenido del enlace privado del pedido.
  const bell=document.getElementById("filler-bell");
  const alertPanel=document.getElementById("filler-alert-panel");
  const alertContent=document.getElementById("filler-alert-content");
  const alertDot=document.getElementById("filler-bell-dot");
  const trackingTokenPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  function lastTracking(){
    try{
      const item=JSON.parse(localStorage.getItem("filler_last_tracking_v1")||"null");
      return trackingTokenPattern.test(item?.token||"")?item:null;
    }catch{return null;}
  }
  async function refreshAlerts(){
    const item=lastTracking();
    alertContent.replaceChildren();
    if(!item){
      const text=document.createElement("p");
      text.textContent="Todavía no tienes avisos. Cuando hagas un pedido, podrás consultar aquí su preparación.";
      alertContent.appendChild(text);
      alertDot.hidden=true;
      return;
    }
    try{
      const order=await FillerCloud.orderStatus(item.token);
      const headline=document.createElement("strong");
      headline.textContent=(order.status==="Listo"?"🎉 ¡Tu pedido está listo!":order.status==="Preparando"?"🍳 Estamos preparando tu pedido":order.status==="Entregado"?"✓ Pedido entregado":order.status==="Cancelado"?"Pedido cancelado":"☕ Recibimos tu pedido");
      const detail=document.createElement("p");
      detail.textContent="Pedido "+String(order.code||item.code||"")+" · "+(order.status==="Listo"?"Ya puedes pasar a recogerlo.":"Estado actual: "+String(order.status||"En proceso"));
      const link=document.createElement("a");
      link.href="./pedido.html#token="+encodeURIComponent(item.token);
      link.textContent="Ver seguimiento del pedido";
      const notes=Array.isArray(order.messages)?order.messages:[];
      const latest=notes.length?notes[notes.length-1]:null;
      if(latest?.message){
        const note=document.createElement("p");
        note.style.cssText="white-space:pre-wrap;background:#eaf5ec;color:#174b34;padding:11px;border-radius:11px;font-weight:750;overflow-wrap:anywhere";
        note.textContent="✉ Cocina: "+String(latest.message);
        alertContent.append(headline,detail,note,link);
      }else{alertContent.append(headline,detail,link);}
      const seenKey="filler_seen_status_"+item.token;
      const revision=String(order.status||"")+":"+String(order.status_updated_at||"")+":"+String(latest?.id||"");
      const opened=alertPanel.hidden===false;
      if(opened){try{localStorage.setItem(seenKey,revision);}catch{}}
      alertDot.hidden=opened||localStorage.getItem(seenKey)===revision;
    }catch{
      const message=document.createElement("p");
      message.textContent="No pudimos actualizar los avisos en este momento. Intenta nuevamente.";
      alertContent.appendChild(message);
      const link=document.createElement("a");
      link.href="./pedido.html#token="+encodeURIComponent(item.token);
      link.textContent="Abrir seguimiento";
      alertContent.appendChild(link);
      alertDot.hidden=true;
    }
  }
  function closeAlerts(){alertPanel.hidden=true;bell.setAttribute("aria-expanded","false");}
  bell.addEventListener("click",()=>{
    const opening=alertPanel.hidden;
    alertPanel.hidden=!opening;
    bell.setAttribute("aria-expanded",String(opening));
    if(opening)refreshAlerts();
  });
  document.getElementById("filler-alert-close").addEventListener("click",closeAlerts);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeAlerts();});
  document.addEventListener("click",event=>{
    if(!alertPanel.hidden&&!alertPanel.contains(event.target)&&!bell.contains(event.target))closeAlerts();
  });
  refreshAlerts();
  setInterval(()=>{if(!document.hidden)refreshAlerts();},30000);
  const prev=document.getElementById("client-status");
  if(prev?.textContent?.includes("guardado en este navegador")){prev.textContent="Los pedidos locales anteriores no fueron enviados a cocina. La recepción compartida está en configuración.";}
  loadCustomerAccount();
  window.addEventListener("pageshow",loadCustomerAccount);
  refresh();
  setInterval(()=>{if(!working)refresh();},15000);
})();
