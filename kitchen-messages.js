/* Fiiller Café — mensajes de cocina asociados a una comanda real. */
(() => {
  "use strict";
  const style=document.createElement("style");
  style.textContent=`
    #filler-msg-modal[hidden]{display:none!important}
    #filler-msg-modal{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;background:rgba(7,37,26,.77);padding:13px}
    .filler-msg-dialog{width:min(100%,550px);max-height:94dvh;overflow:auto;border-radius:22px;background:#fffdf8;padding:22px;box-shadow:0 25px 90px #001a1299;color:#173b2a}
    .filler-msg-top{display:flex;justify-content:space-between;align-items:start;gap:14px}
    .filler-msg-top h2{margin:4px 0 5px;font-size:23px;line-height:1.15}
    .filler-msg-close{background:#eaf3ed;color:#07543a;border-radius:11px;padding:8px 12px;flex:0 0 auto}
    .filler-msg-mini{color:#587165;font-size:12px;line-height:1.55;margin:0 0 15px}
    .filler-msg-templates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}
    .filler-msg-template{background:#edf4ef;border:1px solid #cee1d5;border-radius:11px;color:#165b3c;padding:11px 9px;font-size:12px;font-weight:800;text-align:left}
    .filler-msg-template:hover,.filler-msg-template:focus-visible{background:#d9eddf}
    .filler-msg-template[disabled]{opacity:.5}
    #filler-msg-text{display:block;box-sizing:border-box;width:100%;resize:vertical;min-height:115px;max-height:220px;padding:12px;background:#fff;border:1px solid #b7cdbe;border-radius:12px;font:inherit;color:#153a29}
    .filler-msg-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 15px;color:#687b6d;font-size:12px}
    .filler-msg-submit{display:block;width:100%;border-radius:13px;background:#006241;color:white;padding:14px;font-size:14px}
    .filler-msg-submit:disabled{opacity:.5}
    .filler-msg-history{margin-top:18px;border-top:1px solid #e2eae2;padding-top:14px}
    .filler-msg-history h3{font-size:15px;margin:0 0 10px}
    .filler-msg-item{padding:11px;border-radius:11px;background:#f2f8f3;margin-bottom:8px}
    .filler-msg-item p{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.5}
    .filler-msg-item small{color:#607267}
    .filler-msg-status{font-size:12px;font-weight:750;line-height:1.5;margin:10px 0}
    .filler-msg-status.error{color:#a53b24}
    .filler-msg-warning{background:#fff2db;border:1px solid #f4d2a4;border-radius:10px;padding:10px;font-size:12px;line-height:1.45;color:#89500f;margin:10px 0}
    @media(max-width:520px){.filler-msg-dialog{padding:16px;border-radius:18px}.filler-msg-templates{grid-template-columns:1fr 1fr}.filler-msg-template{font-size:11px}}
  `;
  document.head.appendChild(style);
  const modal=document.createElement("section");
  modal.id="filler-msg-modal";modal.hidden=true;
  modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","filler-msg-title");
  modal.innerHTML=`
    <div class="filler-msg-dialog">
      <div class="filler-msg-top"><div><h2 id="filler-msg-title">Mensaje al cliente</h2><p id="filler-msg-customer" class="filler-msg-mini"></p></div><button type="button" id="filler-msg-close" class="filler-msg-close" aria-label="Cerrar mensaje">✕</button></div>
      <p class="filler-msg-mini">El cliente verá lo que escribas en el seguimiento privado de este pedido. No se envía por WhatsApp ni SMS.</p>
      <div class="filler-msg-templates" aria-label="Mensajes rápidos">
        <button type="button" class="filler-msg-template" data-template="ready">✅ Tu pedido está listo</button>
        <button type="button" class="filler-msg-template" data-template="prep">🍳 Estamos preparando</button>
        <button type="button" class="filler-msg-template" data-template="delay">⏱️ Pequeño retraso</button>
        <button type="button" class="filler-msg-template" data-template="counter">☕ Pasar a mostrador</button>
      </div>
      <label style="display:block;font-weight:800;font-size:13px;margin:12px 0 7px" for="filler-msg-text">Escribir observación o aviso</label>
      <textarea id="filler-msg-text" maxlength="500" placeholder="Ej. Tu bebida se prepara al momento. Puedes pasar al mostrador para recogerla."></textarea>
      <div class="filler-msg-foot"><span>Mensaje visible en el seguimiento del cliente</span><span id="filler-msg-count">0/500</span></div>
      <div id="filler-msg-warning" class="filler-msg-warning" hidden></div>
      <button type="button" class="filler-msg-submit" id="filler-msg-send">Enviar mensaje al cliente</button>
      <p id="filler-msg-result" class="filler-msg-status" role="status" aria-live="polite"></p>
      <section class="filler-msg-history" aria-label="Mensajes enviados"><h3>Mensajes enviados</h3><div id="filler-msg-list" class="filler-msg-mini">Cargando mensajes…</div></section>
    </div>`;
  document.body.appendChild(modal);
  const get=id=>document.getElementById(id);
  const textarea=get("filler-msg-text"),send=get("filler-msg-send");
  const status=get("filler-msg-result"),history=get("filler-msg-list");
  let current=null,kind="observacion",previousFocus=null,busy=false,sequence=0;
  const templates={
    ready:"Tu pedido está listo. Puedes pasar a recogerlo en Fiiller Café. ¡Gracias por esperar!",
    prep:"Ya estamos preparando tu pedido. ¡Gracias por tu paciencia!",
    delay:"Tu pedido tendrá un pequeño retraso. Estamos trabajando para entregártelo lo antes posible.",
    counter:"Por favor, acércate al mostrador de Fiiller Café para consultar tu pedido."
  };
  function setStatus(value,error=false){status.textContent=value;status.classList.toggle("error",error);}
  function updateAction(){
    const isReady=kind==="listo"&&current?.status!=="Listo";
    const isDone=["Entregado","Cancelado"].includes(current?.status);
    get("filler-msg-warning").hidden=!isReady;
    get("filler-msg-warning").textContent=isReady?"Esta acción también cambiará el estado del pedido a «Listo». Úsala solo cuando esté preparado.":"";
    send.textContent=isReady&&!isDone?"Marcar como Listo y enviar mensaje":"Enviar mensaje al cliente";
    send.disabled=busy||!textarea.value.trim()||(isReady&&isDone);
    get("filler-msg-count").textContent=textarea.value.length+"/500";
  }
  function close(){
    if(busy)return;
    modal.hidden=true;current=null;sequence++;
    previousFocus?.isConnected&&previousFocus.focus({preventScroll:true});
    previousFocus=null;
  }
  get("filler-msg-close").addEventListener("click",close);
  modal.addEventListener("click",event=>{if(event.target===modal)close();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!modal.hidden)close();});
  textarea.addEventListener("input",()=>{
    // Escribir libremente nunca cambia por sí solo el estado del pedido.
    if(kind==="listo"&&textarea.value.trim()!==templates.ready)kind="observacion";
    updateAction();
  });
  modal.querySelectorAll("[data-template]").forEach(button=>button.addEventListener("click",()=>{
    const type=button.dataset.template;
    textarea.value=templates[type]||"";
    kind=type==="ready"?"listo":(type==="prep"?"informacion":"observacion");
    setStatus("");updateAction();textarea.focus();
  }));
  function renderHistory(items){
    history.replaceChildren();
    if(!items.length){history.textContent="Todavía no hay mensajes enviados a este cliente.";return;}
    for(const item of items){
      const block=document.createElement("article"),when=document.createElement("small"),paragraph=document.createElement("p");
      block.className="filler-msg-item";
      const date=new Date(item.created_at);
      when.textContent=(item.kind==="listo"?"✅ Pedido listo · ":"✉ Cocina · ")+
        (Number.isFinite(date.getTime())?date.toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"");
      paragraph.textContent=String(item.message||"");
      block.append(when,paragraph);history.append(block);
    }
  }
  async function loadHistory(orderId,requestId){
    try{const items=await FillerCloud.orderMessages(orderId);if(requestId===sequence)renderHistory(items);}
    catch(error){if(requestId===sequence)history.textContent="No pudimos cargar los mensajes: "+error.message;}
  }
  send.addEventListener("click",async()=>{
    if(busy||!current)return;
    const value=textarea.value.trim();
    if(!value||value.length>500)return;
    const order=current;
    busy=true;setStatus("Publicando mensaje…");updateAction();
    try{
      if(kind==="listo"&&order.status!=="Listo"){
        if(["Entregado","Cancelado"].includes(order.status))throw Error("No se puede marcar como listo un pedido cerrado.");
        await FillerCloud.updateOrder(order.uuid,"Listo");
        order.status="Listo";
      }
      await FillerCloud.sendOrderMessage(order.uuid,value,kind);
      setStatus("✓ Mensaje enviado. El cliente lo verá en su seguimiento privado.");
      textarea.value="";kind="observacion";updateAction();
      await loadHistory(order.uuid,sequence);
    }catch(error){
      setStatus("No se pudo publicar el mensaje: "+error.message+
        (order.status==="Listo"&&kind==="listo"?" El estado ya pudo cambiar a «Listo»; revisa la comanda.":""),true);
    }finally{busy=false;updateAction();}
  });
  function open(order){
    if(!order?.uuid)return;
    current={...order};kind="observacion";previousFocus=document.activeElement;
    textarea.value="";history.textContent="Cargando mensajes…";setStatus("");
    get("filler-msg-customer").textContent="Pedido "+String(order.id||"")+" · "+String(order.customer||"Cliente");
    modal.hidden=false;sequence++;
    updateAction();get("filler-msg-close").focus();
    loadHistory(order.uuid,sequence);
  }
  window.FillerKitchenMessages=Object.freeze({open});
})();
