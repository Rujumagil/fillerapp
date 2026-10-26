/* Control del catálogo TPV: precios reales, claves oficiales y activación administrativa. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const el=id=>document.getElementById(id);
let products=[],extras=[],view="pending",busy=false;
const notify=(message,error=false)=>{
 const node=el("tpv-notice");node.textContent=message;node.classList.toggle("error",error);node.hidden=!message;
};
const money=value=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2}).format(Number(value||0));
async function authorization(){
 const role=await FillerCloud.staffRole();
 if(role!=="admin")throw Error("Solo la cuenta admin de Filler Café puede editar este catálogo.");
 let session;
 try{session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");}catch{}
 if(!session?.access_token)throw Error("Tu sesión terminó. Vuelve a entrar.");
 return session.access_token;
}
async function request(path,method="GET",body=null){
 const auth=await authorization();
 const headers={"apikey":KEY,"authorization":"Bearer "+auth,"accept":"application/json"};
 if(body!==null)headers["content-type"]="application/json";
 if(method!=="GET")headers.Prefer="return=representation";
 const response=await fetch(BASE+"/rest/v1/"+path,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.message||data?.hint||"Error de Supabase ("+response.status+").");
 return data;
}
async function load(){
 el("tpv-refresh").disabled=true;notify("Consultando productos y códigos oficiales…");
 try{
  const [a,b]=await Promise.all([
   request("filler_products?select=id,tpv_code,name,category,price,stock,active&tpv_code=not.is.null&order=tpv_code.asc"),
   request("filler_extras?select=id,tpv_code,name,price,enabled&tpv_code=not.is.null&order=tpv_code.asc")
  ]);
  products=Array.isArray(a)?a:[];extras=Array.isArray(b)?b:[];
  display();notify("✓ Catálogo actualizado. Los cambios de precio y disponibilidad se guardan en Supabase.");
 }catch(error){
  notify("No se pudo recuperar el catálogo: "+error.message,true);
 }finally{el("tpv-refresh").disabled=false;}
}
function element(tag,className,text){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=text;
 return e;
}
function display(){
 el("tpv-count-all").textContent=products.length;
 el("tpv-count-pending").textContent=products.filter(x=>!x.active).length;
 el("tpv-count-extras").textContent=extras.length;
 const term=el("tpv-search").value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const list=view==="extras"?extras:view==="pending"?products.filter(p=>!p.active):view==="published"?products.filter(p=>p.active):[...products,...extras];
 const matches=list.filter(p=>(String(p.tpv_code)+" "+String(p.name)+" "+String(p.category||"")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(term));
 el("tpv-showing").textContent="Mostrando "+matches.length+" de "+list.length+" registros · Sin existencias públicas.";
 const host=el("tpv-products");host.replaceChildren();
 if(!matches.length){host.append(element("p","muted","No encontramos productos en esta sección."));return;}
 for(const item of matches){
  const isExtra=!Object.prototype.hasOwnProperty.call(item,"active");
  const isActive=isExtra?item.enabled:item.active;
  const card=element("article","product");
  const top=element("div","product-header");
  const heading=element("div");
  heading.append(element("span","sku",item.tpv_code),element("h3","",item.name));
  heading.append(element("small","",isExtra?"Extra o complemento":item.category));
  const pill=element("span","state"+(isActive?" active":""),isActive?"Publicado":Number(item.price)>0?"Precio confirmado · inactivo":"Precio pendiente");
  top.append(heading,pill);
  const bottom=element("div","product-bottom");
  const label=element("label","",isExtra?"Precio adicional (MXN)":"Precio de venta (MXN)");
  const price=element("input");
  price.type="number";price.min="0";price.step="0.01";
  price.placeholder="Captura el precio";
  price.value=Number(item.price)>0?String(item.price):"";
  price.setAttribute("aria-label","Precio de "+item.name);
  label.append(price);
  const buttons=element("div","product-actions");
  const inventoryLabel=isExtra?null:element("label","","Existencia interna (no se muestra al cliente)");
  const inventory=isExtra?null:element("input");
  if(inventory){
    inventory.type="number";inventory.min="0";inventory.step="1";
    inventory.value=String(item.stock||0);
    inventory.setAttribute("aria-label","Existencia interna de "+item.name);
    inventoryLabel.append(inventory);
  }

  const save=element("button","secondary","Guardar precio");
  const toggle=element("button",isActive?"outline":"",""+(isActive?"Retirar":"Publicar"));
  const text=element("small","muted",isActive?"Actualmente visible para clientes.":"No disponible para pedido hasta publicarlo.");
  const send=async(activeChange)=>{
   if(busy)return;
   const raw=price.value.trim(),cost=Number(raw);
   if(raw===""||!Number.isFinite(cost)||cost<0||cost>100000){notify("Introduce un precio válido para "+item.name+".",true);price.focus();return;}
   if(activeChange===true&&cost<=0){notify("Define un precio mayor que cero antes de publicar "+item.name+".",true);price.focus();return;}
   if(activeChange===true&&!isExtra&&Number(item.stock)<=0){
     notify("Antes de publicar "+item.name+", configura su existencia interna. Las ventas de octubre no indican inventario disponible.",true);
     inventory.focus();return;
   }
   if(activeChange===true&&!confirm("¿Publicar "+item.name+" ("+item.tpv_code+") a "+money(cost)+"? Verifica que las existencias internas estén configuradas."))return;
   if(activeChange===false&&!confirm("¿Retirar "+item.name+" del menú público? No modifica existencias."))return;
   busy=true;save.disabled=true;toggle.disabled=true;
   try{
    const update={price:cost};
    if(activeChange!==null)update[isExtra?"enabled":"active"]=activeChange;
    const name=isExtra?"filler_extras":"filler_products";
    const result=await request(name+"?id=eq."+encodeURIComponent(item.id),"PATCH",update);
    if(!Array.isArray(result)||result.length!==1)throw Error("No se pudo verificar el guardado.");
    Object.assign(item,result[0]);
    notify("✓ "+item.tpv_code+" actualizado en el catálogo de Filler Café.");
    display();
   }catch(error){notify("No se guardó "+item.tpv_code+": "+error.message,true)}
   finally{busy=false;save.disabled=false;toggle.disabled=false;}
  };
  let stockButton=null;
  if(inventory){
    stockButton=element("button","secondary","Guardar existencia");
    stockButton.addEventListener("click",async()=>{
      if(busy)return;
      const newStock=Number(inventory.value);
      if(inventory.value.trim()===""||!Number.isInteger(newStock)||newStock<0||newStock>1000000){
        notify("La existencia debe ser un número entero igual o mayor que cero.",true);
        inventory.focus();return;
      }
      busy=true;stockButton.disabled=true;
      try{
        const updated=await request("filler_products?id=eq."+encodeURIComponent(item.id),"PATCH",{stock:newStock});
        if(!Array.isArray(updated)||updated.length!==1)throw Error("No se pudo confirmar la actualización.");
        Object.assign(item,updated[0]);
        notify("✓ Existencia interna actualizada para "+item.tpv_code+". El número nunca aparece en el menú público.");
        display();
      }catch(error){notify("No se actualizó la existencia: "+error.message,true);}
      finally{busy=false;stockButton.disabled=false;}
    });
  }
  save.addEventListener("click",()=>send(null));
  toggle.addEventListener("click",()=>send(!isActive));
  buttons.append(save,toggle);
  if(stockButton)buttons.append(stockButton);
  if(inventoryLabel)bottom.append(label,inventoryLabel,buttons);
  else bottom.append(label,buttons);
  card.append(top,bottom,text);
  host.append(card);
 }
}
el("tpv-search").addEventListener("input",display);
el("tpv-tabs").querySelectorAll("button[data-view]").forEach(b=>b.addEventListener("click",()=>{
 view=b.dataset.view;
 el("tpv-tabs").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
 display();
}));
el("tpv-refresh").addEventListener("click",load);
el("tpv-exit").addEventListener("click",()=>{
 FillerCloud.logout();products=[];extras=[];
 el("tpv-dashboard").hidden=true;el("tpv-login").hidden=false;
 notify("Sesión cerrada.");
});
el("tpv-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const form=event.currentTarget,button=form.querySelector("button");
 button.disabled=true;notify("");
 try{
  const staff=await FillerCloud.login("admin",form.elements.password.value);
  form.elements.password.value="";
  if(staff.role!=="admin")throw Error("Solo el administrador puede ingresar.");
  el("tpv-login").hidden=true;el("tpv-dashboard").hidden=false;
  await load();
 }catch(error){notify("No pudimos iniciar sesión: "+error.message,true)}
 finally{button.disabled=false;}
});
(async()=>{
 const role=await FillerCloud.staffRole();
 if(role==="admin"){
  el("tpv-login").hidden=true;el("tpv-dashboard").hidden=false;await load();
 }
})().catch(error=>notify("No se pudo validar la sesión: "+error.message,true));
})();
