/* Filler Café - Impresión individual de cada pedido.
 * Requiere ticket-print.css en la página. No crea ni altera pedidos.
 */
(() => {
  "use strict";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const amount=n=>"$"+Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});
  const dateTime=ts=>{
    const d=new Date(Number(ts));
    return Number.isFinite(d.getTime())?d.toLocaleString("es-MX",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"Fecha no disponible";
  };
  const WIDTHS=Object.freeze({"80":"72mm","58":"50mm"});
  const paperKey="filler_ticket_paper_v1";
  function paper(){try{return localStorage.getItem(paperKey)==="58"?"58":"80";}catch{return"80";}}
  function setPaper(value){
    const safe=value==="58"?"58":"80";
    try{localStorage.setItem(paperKey,safe);}catch{}
    return safe;
  }
  function ticketHtml(order,kind){
    const isClient=kind==="cliente";
    const items=Array.isArray(order.items)?order.items:[];
    const itemRows=items.map(item=>{
      const qty=Number(item.qty)||0;
      const extras=Array.isArray(item.extras)?item.extras:[];
      const extrasHtml=extras.map(x=>'<div class="tp-extra">+ '+esc(x.name)+
        (isClient?' ('+amount(x.price)+')':"")+'</div>').join("");
      return '<div class="tp-row"><div><div class="tp-name">'+esc(item.name)+'</div>'+
        extrasHtml+(isClient?'<div class="tp-meta">'+qty+' x '+amount(item.price)+'</div>':"")+
        '</div><strong class="tp-qty">'+qty+'×</strong></div>';
    }).join("");
    const totalUnits=items.reduce((n,item)=>n+(Number(item.qty)||0),0);
    return '<div class="tp-title">FILLER CAFÉ</div>'+
      '<div class="tp-subtitle">'+(isClient?"TICKET DEL CLIENTE":"COMANDA DE COCINA")+'</div>'+
      '<hr class="tp-rule"><div class="tp-code">'+esc(order.id)+'</div>'+
      '<div class="tp-meta"><strong>Pedido:</strong> '+dateTime(order.createdTs)+'</div>'+
      '<div class="tp-meta"><strong>Estado:</strong> '+esc(order.status)+'</div>'+
      '<div class="tp-meta"><strong>Cliente:</strong> '+esc(order.customer)+'</div>'+
      (isClient?'<div class="tp-meta"><strong>Teléfono:</strong> '+esc(order.phone)+'</div>':"")+
      '<div class="tp-meta"><strong>Entrega/recolección:</strong> '+esc(order.pickup)+'</div>'+
      '<hr class="tp-rule">'+itemRows+
      '<hr class="tp-rule">'+
      '<div class="tp-meta"><strong>Total de piezas:</strong> '+totalUnits+'</div>'+
      (order.notes?'<div class="tp-meta"><strong>INDICACIONES:</strong></div><div class="tp-notes">'+esc(order.notes)+'</div><hr class="tp-rule">':"")+
      (isClient?'<div class="tp-total"><span>TOTAL</span><span>'+amount(order.total)+'</span></div>':"")+
      '<div class="tp-footer">'+(isClient?"Gracias por tu preferencia":"*** FIN DE COMANDA ***")+'</div>';
  }
  let activeTicket=null;
  let cleanupTimer=null;
  function cleanup(){
    if(activeTicket){activeTicket.remove();activeTicket=null;}
    if(cleanupTimer){clearTimeout(cleanupTimer);cleanupTimer=null;}
  }
  window.addEventListener("afterprint",cleanup);
  function print(order,kind="cocina"){
    if(!order||!order.id||!Array.isArray(order.items))throw new Error("No se encontró la información completa de esta comanda.");
    cleanup();
    activeTicket=document.createElement("article");
    activeTicket.id="filler-print-root";
    activeTicket.setAttribute("aria-label","Impresión de pedido "+String(order.id));
    activeTicket.style.setProperty("--ticket-width",WIDTHS[paper()]);
    activeTicket.innerHTML=ticketHtml(order,kind==="cliente"?"cliente":"cocina");
    document.body.appendChild(activeTicket);
    window.print();
    // Respaldo para navegadores que no disparan afterprint.
    cleanupTimer=setTimeout(cleanup,90000);
  }
  window.FillerTickets=Object.freeze({print,paper,setPaper});
})();