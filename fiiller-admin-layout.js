/* Fiiller Control · Layout enhancement.
   Presentation only: preserves existing cancellation inbox, install actions, menu links and role checks. */
(()=>{
"use strict";
const main=document.querySelector("main.admin-shell"),intro=document.querySelector(".dashboard-intro");
if(!main||!intro)return;
const icon=id=>'<svg class="module-svg" aria-hidden="true"><use href="#ico-'+id+'"></use></svg>';
const items=[
 ["sales","Ventas de hoy · Arrow","dashboard-ventas.html","chart","Corte TPV pendiente"],
 ["orders","Pedidos digitales activos","pedidos.html","clipboard","Consultando pedidos"],
 ["messages","Avisos de mensajes","atencion.html?personal=1","message","Avisos de esta sesión"],
 ["stock","Insumos bajo mínimo","almacen-fiiller.html#inventory","box","Consultando almacén"]
];
const overview=document.createElement("section");
overview.className="fiiller-snapshot";
overview.id="resumen";
overview.setAttribute("aria-labelledby","fiiller-overview-title");
overview.innerHTML='<div class="fiiller-snapshot-head"><div><span class="eyebrow">INDICADORES OPERATIVOS · SOLO LECTURA</span><h2 id="fiiller-overview-title">Resumen del día</h2></div><button type="button" id="admin-kpi-refresh">↻ Actualizar</button></div>'+
 '<div class="fiiller-snapshot-grid">'+items.map(([key,label,url,glyph,note])=>
 '<a href="'+url+'" class="fiiller-snapshot-card" id="kpi-'+key+'">'+
 '<span class="fiiller-snapshot-top"><span class="fiiller-snapshot-label">'+label+'</span><span class="fiiller-snapshot-icon">'+icon(glyph)+'</span></span>'+
 '<strong class="fiiller-snapshot-value" id="kpi-'+key+'-value">—</strong><span class="fiiller-snapshot-note" id="kpi-'+key+'-note">'+note+'</span></a>').join("")+'</div>'+
 '<p id="admin-kpi-updated" role="status" aria-live="polite">Consultando las fuentes autorizadas…</p>';
intro.before(overview);
const nav=document.querySelector(".jump-nav");
if(nav){
 const link=document.createElement("a");
 link.href="#resumen";link.textContent="Indicadores";
 nav.prepend(link);
}
const oldGrid=document.querySelector(".activity-grid");
const cancellation=document.getElementById("filler-cancellation-inbox");
const install=document.querySelector("[data-install-panel]");
if(oldGrid&&cancellation){
 const priorities=document.createElement("section");
 priorities.id="admin-priorities";
 priorities.className="activity-card";
 priorities.setAttribute("aria-label","Prioridades operativas");
 priorities.innerHTML='<h3 class="fiiller-priority-title">Prioridades operativas</h3>'+
 [
  ["orders","Pedidos por atender","pedidos.html","Consultando pedidos…"],
  ["stock","Existencias por revisar","almacen-fiiller.html#inventory","Consultando inventario…"],
  ["sales","Corte Arrow de hoy","dashboard-ventas.html","Consultando corte…"]
 ].map(([key,label,url,note])=>
 '<a class="fiiller-priority-row" href="'+url+'" id="priority-'+key+'">'+
 '<span class="fiiller-priority-text"><strong>'+label+'</strong><small id="priority-'+key+'-note">'+note+'</small></span>'+
 '<span class="fiiller-priority-value" id="priority-'+key+'-value">—</span></a>'
 ).join("");
 oldGrid.replaceChildren(cancellation,priorities);
}
if(install){
 install.classList.add("fiiller-install-mini");
 const tools=document.querySelector("#herramientas");
 if(tools)tools.after(install);
}
})();