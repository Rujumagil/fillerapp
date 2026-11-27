/* Fiiller Café · Registro rápido de almacén. Reutiliza RPC seguras del módulo principal. */
(function(){
"use strict";
window.FiillerWarehouseQuick={
 init:function(config){
  const $=id=>document.getElementById(id);
  const clean=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").replace(/\s+/g," ").trim();
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const format=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:3});
  let selectedId="",recent=[],busy=false,lastReceipt=null;
  const current=()=>config.getInventory().find(x=>String(x.id)===String(selectedId));
  function notice(text,error){
   $("quick-notice").textContent=text;
   $("quick-notice").classList.toggle("danger",!!error);
  }
  function familyOptions(){
   const select=$("quick-family"),old=select.value;
   const families=[...new Set(config.getInventory().map(i=>String(i.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
   const names=families.join("|");
   if(select.dataset.families===names)return;
   select.innerHTML='<option value="">Todas las familias</option>'+families.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join("");
   select.dataset.families=names;
   select.value=families.includes(old)?old:"";
  }
  function ranked(){
   const term=clean($("quick-search").value),words=term.split(" ").filter(Boolean),family=$("quick-family").value;
   const codes=new Map();
   config.getBarcodes().forEach(b=>{
    const id=String(b.item_id),list=codes.get(id)||[];
    list.push(String(b.barcode));codes.set(id,list);
   });
   return config.getInventory().map(item=>{
    const barcodeList=codes.get(String(item.id))||[];
    const name=clean(item.name),sku=clean(item.code),other=clean(item.category),bars=barcodeList.map(clean);
    const haystack=[name,sku,other,...bars].join(" ");
    if(family&&item.category!==family)return null;
    if(words.some(word=>!haystack.includes(word)))return null;
    let score=8;
    if(term){
     if(sku===term||bars.includes(term))score=0;
     else if(name===term)score=1;
     else if(name.startsWith(term))score=2;
     else if(sku.startsWith(term)||bars.some(b=>b.startsWith(term)))score=3;
     else if(name.includes(term))score=4;
     else score=5;
    }else if(recent.includes(String(item.id)))score=recent.indexOf(String(item.id))-10;
    return {item,score};
   }).filter(Boolean).sort((a,b)=>a.score-b.score||String(a.item.name).localeCompare(String(b.item.name),"es"));
  }
  function renderSelected(){
   const item=current();
   $("quick-selected").hidden=!item;
   $("quick-form").hidden=!item;
   $("quick-lot").disabled=!item;
   if(!item){
    $("quick-selected").innerHTML='<strong>Selecciona un producto</strong><p>Busca arriba por nombre, SKU o código de barras para mostrar sus existencias.</p>';
    return;
   }
   const low=Number(item.min_quantity)>0&&Number(item.quantity)<=Number(item.min_quantity);
   $("quick-selected").innerHTML='<span class="quick-caption">PRODUCTO SELECCIONADO</span><strong>'+safe(item.name)+'</strong><div>'+safe(item.code)+' · '+safe(item.category)+'</div><div class="quick-stock">Existencia: <b>'+format(item.quantity)+' '+safe(item.unit)+'</b> · Mínimo: '+format(item.min_quantity)+' '+safe(item.unit)+(low?' · <em>Bajo mínimo</em>':'')+'</div>';
   $("quick-unit").textContent="Unidad: "+item.unit;
   $("quick-quantity").placeholder=$("quick-mode").value==="conteo"?"Existencia total en "+item.unit:"Cantidad en "+item.unit;
   preview();
  }
  function preview(){
   const item=current();
   if(!item)return;
   const value=$("quick-quantity").value.trim(),qty=Number(value),mode=$("quick-mode").value;
   const valid=value!==""&&Number.isFinite(qty)&&qty>=0&&qty<=1000000&&Math.abs(qty*1000-Math.round(qty*1000))<0.00001&&(mode==="conteo"||qty>0);
   const end=mode==="conteo"?qty:mode==="entrada"?Number(item.quantity)+qty:Number(item.quantity)-qty;
   const allowed=valid&&end>=0;
   $("quick-preview").textContent=!valid?"Captura una cantidad válida. Las unidades no se convierten automáticamente.":!allowed?"La salida supera la existencia disponible.":"Existencia actual: "+format(item.quantity)+" "+item.unit+" → Después: "+format(end)+" "+item.unit;
   $("quick-preview").classList.toggle("danger",valid&&!allowed);
   $("quick-save").disabled=busy||!allowed;
  }
  function render(){
   familyOptions();
   const rows=ranked(),query=$("quick-search").value.trim();
   $("quick-results-count").textContent=rows.length+" coincidencias";
   $("quick-results").innerHTML=rows.slice(0,40).map(({item})=>
    '<button class="quick-result" type="button" data-quick-id="'+safe(item.id)+'" aria-pressed="'+(String(item.id)===String(selectedId))+'"><span><strong>'+safe(item.name)+'</strong><small>'+safe(item.code)+' · '+safe(item.category)+'</small></span><span>'+format(item.quantity)+' '+safe(item.unit)+'</span></button>'
   ).join("")||'<p class="muted">No encontramos ese insumo. Revisa el nombre o código antes de crear otro.</p>';
   if(rows.length>40)$("quick-results-count").textContent+=" · Mostrando primeros 40";
   if(!query&&recent.length)$("quick-results-hint").textContent="Primero se muestran los productos que acabas de usar.";
   else $("quick-results-hint").textContent="Selecciona el resultado correcto; buscar no modifica inventario.";
   renderSelected();
  }
  function select(id){
   const item=config.getInventory().find(i=>String(i.id)===String(id));
   if(!item)return;
   selectedId=String(item.id);
   recent=[selectedId,...recent.filter(x=>x!==selectedId)].slice(0,12);
   $("quick-quantity").value="";
   $("quick-note").value="";
   notice("Verifica el código y la unidad antes de registrar el movimiento.");
   config.navigate("quick");
   render();
   $("quick-quantity").focus();
  }
  $("quick-search").addEventListener("input",render);
  $("quick-family").addEventListener("change",render);
  $("quick-results").addEventListener("click",e=>{
   const button=e.target.closest("[data-quick-id]");
   if(button)select(button.dataset.quickId);
  });
  $("quick-search").addEventListener("keydown",e=>{
   if(e.key!=="Enter")return;
   e.preventDefault();
   const value=clean(e.currentTarget.value);
   const exact=config.getInventory().find(i=>clean(i.code)===value||clean(i.name)===value);
   const bc=config.getBarcodes().find(b=>clean(b.barcode)===value);
   const match=bc?config.getInventory().find(i=>String(i.id)===String(bc.item_id)):exact;
   if(match)select(match.id);
   else {
    const matches=ranked();
    if(matches.length===1)select(matches[0].item.id);
    else notice("Elige un producto de los resultados para evitar errores.",matches.length===0);
   }
  });
  $("quick-mode").addEventListener("change",renderSelected);
  $("quick-quantity").addEventListener("input",preview);
  $("quick-next").addEventListener("click",()=>{
   selectedId="";$("quick-search").value="";$("quick-quantity").value="";$("quick-note").value="";
   render();$("quick-search").focus();notice("Listo para buscar el siguiente producto.");
  });
  $("quick-scan-camera").addEventListener("click",()=>{config.navigate("barcode");$("barcode-input").focus();});
  $("quick-new").addEventListener("click",()=>{
   config.navigate("inventory");
   $("create-form").scrollIntoView({behavior:"smooth",block:"start"});
   $("create-form").elements.name.focus();
  });
  $("quick-lot").addEventListener("click",()=>{
   const item=current();if(!item)return;
   config.navigate("expiry");$("lot-item").value=item.id;
   $("lot-form").scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("quick-form").addEventListener("submit",async e=>{
   e.preventDefault();if(busy)return;
   const item=current(),mode=$("quick-mode").value,value=$("quick-quantity").value.trim(),qty=Number(value);
   const note=$("quick-note").value.trim();
   if(!item){notice("Selecciona un producto.",true);return;}
   if(!["entrada","salida","conteo"].includes(mode)||value===""||!Number.isFinite(qty)||qty<0||qty>1000000||Math.abs(qty*1000-Math.round(qty*1000))>0.00001||(mode!=="conteo"&&qty<=0)){notice("Cantidad no válida para el movimiento.",true);return;}
   if(note.length<3){notice("Registra un motivo o referencia de al menos 3 caracteres.",true);$("quick-note").focus();return;}
   const signature=[item.id,mode,qty,clean(note)].join("|");
   if(lastReceipt&&lastReceipt.signature===signature&&Date.now()-lastReceipt.at<30000){
    notice("Este movimiento idéntico acaba de guardarse. Revisa el historial antes de repetirlo.",true);return;
   }
   busy=true;preview();
   let committed=false;
   try{
    const latest=await config.call("filler_inventory_items?select=id,name,code,quantity,unit&id=eq."+encodeURIComponent(item.id)+"&limit=1");
    if(!latest?.length)throw Error("No encontramos el producto. Actualiza la página.");
    const fresh=latest[0];
    if(Number(fresh.quantity)!==Number(item.quantity)||String(fresh.unit)!==String(item.unit)){
     await config.refresh();
     throw Error("La existencia cambió desde que seleccionaste el producto. Revisa el nuevo saldo antes de continuar.");
    }
    const balance=mode==="conteo"?qty:mode==="entrada"?Number(fresh.quantity)+qty:Number(fresh.quantity)-qty;
    if(balance<0)throw Error("No se puede registrar una salida mayor que el inventario disponible.");
    const units=String(item.unit);
    const detail="Producto: "+item.name+" ("+item.code+")\nOperación: "+(mode==="conteo"?"CONTEO FÍSICO":mode.toUpperCase())+"\nActual: "+format(fresh.quantity)+" "+units+"\nCantidad: "+format(qty)+" "+units+"\nNuevo saldo: "+format(balance)+" "+units+"\nReferencia: "+note+"\n\n¿Confirmar y guardar?";
    if(!window.confirm(detail))return;
    if(mode==="conteo"){
     await config.call("rpc/filler_inventory_count",{method:"POST",body:{p_item:item.id,p_physical:qty,p_reason:note}});
    }else{
     await config.call("rpc/filler_inventory_move",{method:"POST",body:{p_item:item.id,p_type:mode,p_quantity:qty,p_note:note}});
    }
    committed=true;lastReceipt={signature,at:Date.now()};
    selectedId="";$("quick-search").value="";$("quick-quantity").value="";$("quick-note").value="";
    try{
     await config.refresh();
     render();notice("✓ Registro guardado correctamente. Puedes buscar el siguiente producto.");
     $("quick-search").focus();
    }catch(error){notice("✓ Movimiento guardado, pero no se pudo actualizar la vista: "+error.message,true);}
   }catch(error){notice(error.message,true);}
   finally{busy=false;preview();}
  });
  return {render,select};
 }
};
})();