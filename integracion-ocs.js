/* Resumen Fiiller + OCS: los datos son agregados y requieren admin autenticado. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const status=(m,err=false)=>{const el=$("status");el.textContent=m;el.classList.toggle("error",err);};
const fmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:0});
const money=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
async function show(){
 const role=await FillerCloud.staffRole();
 if(role!=="admin"){
   $("login-card").hidden=false;$("dashboard").hidden=true;
   status(role?"Esta vista solo está disponible para administración.":"Inicia sesión como administrador para consultar los indicadores.");
   return;
 }
 const session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
 if(!session?.access_token)throw Error("Inicia sesión nuevamente.");
 const response=await fetch(BASE+"/rest/v1/rpc/filler_ocs_admin_summary",{
   method:"POST",headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:"{}",cache:"no-store"
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.message||"No se pudo consultar el resumen de OCS.");
 $("login-card").hidden=true;$("dashboard").hidden=false;
 const sales=data.sales||{}, orders=data.orders||{};
 $("arrow-sales").textContent=money(sales.amount);
 $("arrow-tickets").textContent=fmt(sales.tickets);
 $("app-orders").textContent=fmt(orders.count);
 $("open-orders").textContent=fmt(orders.open);
 $("sales-days").textContent=fmt(sales.days);
 $("sales-units").textContent=fmt(sales.units);
 $("sales-last").textContent=sales.latest_date||"Sin reportes";
 $("orders-delivered").textContent=fmt(orders.delivered);
 $("orders-cancelled").textContent=fmt(orders.cancelled);
 $("orders-value").textContent=money(orders.total_ordered);
 $("updated-at").textContent="Consulta actualizada: "+new Date(data.generated_at).toLocaleString("es-MX");
 status("Datos consultados desde la misma base Supabase de OCS y Fiiller.");
}
$("login-form").addEventListener("submit",async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector("button");button.disabled=true;
 try{
   if(form.elements.username.value.trim().toLowerCase()!=="admin")throw Error("Ingresa como admin.");
   await FillerCloud.login("admin",form.elements.password.value);
   await show();
 }catch(e){status(e.message,true);}finally{button.disabled=false;}
});
$("reload").addEventListener("click",()=>show().catch(e=>status(e.message,true)));
show().catch(e=>status(e.message,true));
})();