/* Fiiller Café · Registro rápido y recepción guiada v2.
   Reutiliza los RPC de administración; ninguna búsqueda altera el inventario. */
(function(){
 "use strict";
 window.FiillerWarehouseQuick={
  init:function(config){
   const $=id=>document.getElementById(id);
   const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").replace(/\s+/g," ").trim();
   const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
   const fmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:3});
   const itemById=id=>config.getInventory().find(i=>String(i.id)===String(id));
   const $note=$("quick-note"),$qty=$("quick-quantity"),$mode=$("quick-mode");
   const getLocal=(key)=>{try{const x=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(x)?x.filter(v=>typeof v==="string").slice(0,30):[];}catch{return [];}};
   const setLocal=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{/* Private browsing: no persistence. */}};
   const state={
    selectedId:"",filter:"all",limit:12,recent:getLocal("fiiller_almacen_recent_v2"),
    favorites:getLocal("fiiller_almacen_favorites_v2"),busy:false,batchBusy:false,
    batch:[],lastSaved:null,pendingLot:null,unknownSingle:false
   };
   const current=()=>itemById(state.selectedId);
   function notice(s,bad=false,scope="quick-notice"){
    const el=$(scope);el.textContent=s;el.classList.toggle("danger",bad);
   }
   function dateToday(){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const v=k=>parts.find(x=>x.type===k)?.value||"";
    return v("year")+"-"+v("month")+"-"+v("day");
   }
   function familyOptions(){
    const el=$("quick-family"),old=el.value;
    const cats=[...new Set(config.getInventory().map(i=>String(i.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    const key=cats.join("\u0001");
    if(el.dataset.key===key)return;
    el.innerHTML='<option value="">Todas las familias</option>'+cats.map(c=>'<option value="'+safe(c)+'">'+safe(c)+'</option>').join("");
    el.dataset.key=key;el.value=cats.includes(old)?old:"";
   }
   function matches(){
    const term=norm($("quick-search").value),terms=term.split(" ").filter(Boolean),family=$("quick-family").value;
    const counted=new Set(config.getCounts().map(x=>String(x.item_id)));
    const bc=new Map();
    config.getBarcodes().forEach(b=>{const id=String(b.item_id),arr=bc.get(id)||[];arr.push(norm(b.barcode));bc.set(id,arr);});
    return config.getInventory().map(item=>{
     const id=String(item.id),name=norm(item.name),code=norm(item.code),bars=bc.get(id)||[];
     const all=[name,code,norm(item.category),...bars].join(" ");
     if(family&&item.category!==family)return null;
     if(terms.some(t=>!all.includes(t)))return null;
     if(state.filter==="recent"&&!state.recent.includes(id))return null;
     if(state.filter==="favorites"&&!state.favorites.includes(id))return null;
     if(state.filter==="low"&&!(Number(item.min_quantity)>0&&Number(item.quantity)<=Number(item.min_quantity)))return null;
     if(state.filter==="pending"&&counted.has(id))return null;
     let score=10;
     if(term){
      if(code===term||bars.includes(term))score=0;
      else if(name===term)score=1;
      else if(name.startsWith(term))score=2;
      else if(code.startsWith(term)||bars.some(x=>x.startsWith(term)))score=3;
      else if(name.includes(term))score=4;
      else score=5;
     }else if(state.recent.includes(id))score=state.recent.indexOf(id)-20;
     else if(state.favorites.includes(id))score=state.favorites.indexOf(id)-8;
     return {item,score};
    }).filter(Boolean).sort((a,b)=>a.score-b.score||String(a.item.name).localeCompare(String(b.item.name),"es"));
   }
   function renderResults(){
    familyOptions();
    const rows=matches();
    $("quick-results-count").textContent=rows.length+" coincidencia"+(rows.length===1?"":"s");
    $("quick-results").innerHTML=rows.slice(0,state.limit).map(({item})=>{
     const id=String(item.id),favorite=state.favorites.includes(id),selected=state.selectedId===id;
     const low=Number(item.min_quantity)>0&&Number(item.quantity)<=Number(item.min_quantity);
     return '<div class="quick-row"><button class="quick-result" type="button" data-quick-id="'+safe(id)+'" aria-pressed="'+selected+'"><span><strong>'+safe(item.name)+'</strong><small>'+safe(item.code)+' · '+safe(item.category)+'</small></span><span class="quick-balance">'+fmt(item.quantity)+' '+safe(item.unit)+(low?' ⚠':'')+'</span></button><button class="quick-star" type="button" data-quick-star="'+safe(id)+'" aria-pressed="'+favorite+'" aria-label="'+(favorite?"Quitar de":"Agregar a")+' favoritos: '+safe(item.name)+'">'+(favorite?"★":"☆")+'</button></div>';
    }).join("")||'<p class="quick-context">No hay productos para esta búsqueda. Prueba otro nombre, código o filtro antes de crear un insumo nuevo.</p>';
    $("quick-more").hidden=rows.length<=state.limit;
    $("quick-more").textContent="Ver más productos ("+Math.min(rows.length-state.limit,20)+")";
    $("quick-results-hint").textContent=$("quick-search").value.trim()?"Selecciona el insumo correcto antes de registrar.":"Mostrando pocos resultados para trabajar rápido. Escribe o cambia de filtro para localizar otros.";
    document.querySelectorAll("[data-quick-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.quickFilter===state.filter)));
   }
   function lotInfo(){
    return {code:$("quick-lot-code").value.trim(),expiry:$("quick-expiry").value};
   }
   function isLotPresent(itemId,code){
    return config.getLots().some(l=>String(l.item_id)===String(itemId)&&norm(l.lot_code)===norm(code));
   }
   function getInput(){
    const item=current(),mode=$mode.value,val=$qty.value.trim(),quantity=Number(val),note=$note.value.trim();
    const lot=lotInfo(),hasLot=!!(lot.code||lot.expiry);
    if(!item)return {error:"Selecciona un insumo."};
    if(!["entrada","salida","conteo"].includes(mode))return {error:"Tipo de registro inválido."};
    if(val===""||!Number.isFinite(quantity)||quantity<0||quantity>1000000||Math.abs(quantity*1000-Math.round(quantity*1000))>0.00001||(mode!=="conteo"&&quantity<=0))return {error:"Escribe una cantidad válida, según la unidad del insumo."};
    if(mode==="salida"&&quantity>Number(item.quantity))return {error:"La salida excede el saldo del almacén."};
    if(note.length<3||note.length>250)return {error:"Introduce un proveedor, folio o motivo de 3 a 250 caracteres."};
    if(mode==="entrada"&&hasLot){
     if(!lot.code||!lot.expiry)return {error:"Si registras lote, son obligatorios el número de lote y la fecha de caducidad."};
     if(lot.expiry<dateToday())return {error:"El lote ya está caducado. Revísalo antes de ingresarlo como disponible."};
     if(isLotPresent(item.id,lot.code))return {error:"Este número de lote ya existe para el insumo. Revisa el control de lotes antes de continuar."};
    }
    return {item,mode,quantity,note,lot:mode==="entrada"&&hasLot?lot:null};
   }
   function preview(){
    const item=current();
    const hasItem=!!item;
    $("quick-form").hidden=!hasItem;
    $("quick-empty-hint").hidden=hasItem;
    $("quick-lot").disabled=!hasItem;
    if(!hasItem){
     $("quick-selected").innerHTML='<strong>Selecciona un producto</strong><p>La ficha mostrará existencias y unidad de captura.</p>';
     $("quick-save").disabled=true;$("quick-stage").disabled=true;
     return;
    }
    const low=Number(item.min_quantity)>0&&Number(item.quantity)<=Number(item.min_quantity);
    $("quick-selected").innerHTML='<span class="quick-caption">INSUMO SELECCIONADO</span><strong>'+safe(item.name)+'</strong><div>SKU '+safe(item.code)+' · '+safe(item.category)+'</div><div class="quick-stock">Existencia: <b>'+fmt(item.quantity)+' '+safe(item.unit)+'</b> · Mínimo: '+fmt(item.min_quantity)+' '+safe(item.unit)+(low?' · <em>Bajo mínimo</em>':'')+'</div>';
    $("quick-unit").textContent=item.unit;
    $qty.placeholder=$mode.value==="conteo"?"Saldo final en "+item.unit:"Cantidad en "+item.unit;
    $("quick-lot-fields").hidden=$mode.value!=="entrada";
    const data=getInput();
    if(data.error){
     $("quick-preview").textContent="Pendiente: "+data.error;
     $("quick-preview").classList.add("danger");
    }else{
     const after=data.mode==="conteo"?data.quantity:data.mode==="entrada"?Number(item.quantity)+data.quantity:Number(item.quantity)-data.quantity;
     $("quick-preview").textContent=fmt(item.quantity)+" "+item.unit+" → "+fmt(after)+" "+item.unit+" después de "+(data.mode==="conteo"?"contar":"registrar "+data.mode)+".";
     $("quick-preview").classList.remove("danger");
    }
    const valid=!data.error&&!state.unknownSingle&&!state.pendingLot&&!state.busy&&!state.batchBusy;
    $("quick-save").disabled=!valid;
    $("quick-stage").disabled=!valid||$mode.value!=="entrada";
    $("quick-retry-lot").hidden=!state.pendingLot;
   }
   function renderBatch(){
    const xs=state.batch;
    $("quick-batch-count").textContent=xs.length+" producto"+(xs.length===1?"":"s");
    $("quick-batch-list").innerHTML=xs.map((x,i)=>{
     const item=itemById(x.itemId);
     const status=x.status==="saved"?"Guardado":x.status==="lot_failed"?"Movimiento guardado · lote pendiente":x.status==="unknown"?"Confirmación pendiente":x.status==="moving"?"Registrando…":"Por guardar";
     const cls=x.status==="saved"?"saved":(x.status==="unknown"||x.status==="lot_failed")?"error":"";
     const action=x.status==="pending"?'<button type="button" class="secondary" data-batch-remove="'+i+'">Quitar</button>':x.status==="lot_failed"?'<button type="button" class="secondary" data-batch-retry="'+i+'">Guardar solo lote</button>':"";
     return '<div class="quick-batch-row"><div><strong>'+safe(item?.name||x.name)+'</strong><small>'+fmt(x.qty)+' '+safe(x.unit)+' · '+safe(x.note)+(x.lot?' · Lote '+safe(x.lot.code)+' / '+safe(x.lot.expiry):'')+'</small></div><span class="quick-status '+cls+'">'+safe(status)+'</span>'+action+'</div>';
    }).join("")||'<p class="quick-context">Aún no agregas productos a la recepción.</p>';
    const locked=xs.some(x=>x.status==="unknown"||x.status==="lot_failed"||x.status==="moving");
    $("quick-batch-save").disabled=state.busy||state.batchBusy||locked||!xs.some(x=>x.status==="pending");
    $("quick-batch-clear").disabled=state.batchBusy||!xs.some(x=>x.status==="saved");
   }
   function render(){renderResults();preview();renderBatch();}
   function pick(id){
    const item=itemById(id);if(!item||state.busy||state.batchBusy)return;
    if(state.pendingLot){notice("Primero termina de guardar el lote pendiente.",true);return;}
    state.selectedId=String(item.id);state.unknownSingle=false;
    state.recent=[state.selectedId,...state.recent.filter(x=>x!==state.selectedId)].slice(0,20);
    setLocal("fiiller_almacen_recent_v2",state.recent);
    $qty.value="";$("quick-lot-code").value="";$("quick-expiry").value="";
    config.navigate("quick");
    render();notice("Verifica la unidad antes de capturar.");
    $qty.focus();
   }
   function resetSelection(){
    state.selectedId="";state.unknownSingle=false;$qty.value="";$("quick-lot-code").value="";$("quick-expiry").value="";$("quick-search").value="";
    render();$("quick-search").focus();
   }
   function commitNote(x){return x.note+(x.lot?" | Lote "+x.lot.code+" | Caducidad "+x.lot.expiry:"");}
   async function getFresh(x){
    const rows=await config.call("filler_inventory_items?select=id,name,code,quantity,unit&id=eq."+encodeURIComponent(x.item.id)+"&limit=1");
    if(!Array.isArray(rows)||rows.length!==1)throw Error("El insumo ya no está disponible. Actualiza el almacén.");
    const row=rows[0];
    if(Number(row.quantity)!==Number(x.item.quantity)||String(row.unit)!==String(x.item.unit))
     throw Error("Otro movimiento modificó el saldo de "+x.item.name+". Actualiza existencias y revisa el registro.");
    const after=x.mode==="conteo"?x.quantity:x.mode==="entrada"?Number(row.quantity)+x.quantity:Number(row.quantity)-x.quantity;
    if(after<0)throw Error("No hay existencias suficientes.");
    return {before:Number(row.quantity),after};
   }
   async function saveMovement(x){
    if(x.mode==="conteo")return config.call("rpc/filler_inventory_count",{method:"POST",body:{p_item:x.item.id,p_physical:x.quantity,p_reason:commitNote(x)}});
    return config.call("rpc/filler_inventory_move",{method:"POST",body:{p_item:x.item.id,p_type:x.mode,p_quantity:x.quantity,p_note:commitNote(x)}});
   }
   async function saveLot(x){
    if(!x.lot)return;
    // A lot is metadata, not an additional inventory movement.
    if(isLotPresent(x.item.id,x.lot.code))throw Error("El lote ya fue registrado. Verifica la caducidad y evita sobrescribirlo.");
    return config.call("rpc/filler_inventory_lot_save",{method:"POST",body:{
     p_item:x.item.id,p_lot:x.lot.code,p_expiry:x.lot.expiry,p_quantity:x.quantity,p_received:dateToday()
    }});
   }
   function signature(x){return [x.item.id,x.mode,x.quantity,norm(x.note),x.lot?.code||"",x.lot?.expiry||""].join("|");}
   async function refreshView(){
    try{await config.refresh();}catch(e){notice("El registro fue enviado pero la pantalla no actualizó: "+e.message,true);}
   }
   $("quick-search").addEventListener("input",()=>{state.limit=12;renderResults();});
   $("quick-family").addEventListener("change",()=>{state.limit=12;renderResults();});
   $("quick-filter-tabs").addEventListener("click",e=>{
    const b=e.target.closest("[data-quick-filter]");if(!b)return;
    state.filter=b.dataset.quickFilter;state.limit=12;renderResults();
   });
   $("quick-more").addEventListener("click",()=>{state.limit+=20;renderResults();});
   $("quick-results").addEventListener("click",e=>{
    const star=e.target.closest("[data-quick-star]");
    if(star){
     const id=star.dataset.quickStar;
     state.favorites=state.favorites.includes(id)?state.favorites.filter(v=>v!==id):[id,...state.favorites].slice(0,30);
     setLocal("fiiller_almacen_favorites_v2",state.favorites);renderResults();return;
    }
    const row=e.target.closest("[data-quick-id]");if(row)pick(row.dataset.quickId);
   });
   $("quick-search").addEventListener("keydown",e=>{
    if(e.key!=="Enter")return;
    e.preventDefault();const term=norm(e.currentTarget.value);
    const barcode=config.getBarcodes().find(b=>norm(b.barcode)===term);
    const exact=barcode?itemById(barcode.item_id):config.getInventory().find(i=>norm(i.code)===term||norm(i.name)===term);
    if(exact)pick(exact.id);
    else{
     const rows=matches();
     if(rows.length===1)pick(rows[0].item.id);
     else notice(rows.length?"Selecciona un insumo de la lista.":"No encontramos ese código. Verifica antes de crear otro producto.",!rows.length);
    }
   });
   $mode.addEventListener("change",preview);
   [$qty,$note,$("quick-lot-code"),$("quick-expiry")].forEach(el=>el.addEventListener("input",preview));
   $("quick-next").addEventListener("click",()=>{if(state.pendingLot){notice("Primero completa el registro de lote pendiente.",true);return;}resetSelection();notice("Listo para buscar el siguiente producto.");});
   $("quick-new").addEventListener("click",()=>{
    config.navigate("inventory");$("create-form").scrollIntoView({behavior:"smooth",block:"start"});
    $("create-form").elements.name.focus();
   });
   $("quick-scan-camera").addEventListener("click",()=>{config.navigate("barcode");$("barcode-input").focus();});
   $("quick-lot").addEventListener("click",()=>{
    const item=current();if(!item)return;
    config.navigate("expiry");$("lot-item").value=item.id;
    $("lot-form").scrollIntoView({behavior:"smooth",block:"start"});
   });
   $("quick-form").addEventListener("submit",async e=>{
    e.preventDefault();
    if(state.busy||state.pendingLot||state.batchBusy||state.unknownSingle)return;
    const x=getInput();
    if(x.error){notice(x.error,true);preview();return;}
    const sig=signature(x);
    if(state.lastSaved?.signature===sig&&Date.now()-state.lastSaved.at<30000){
     notice("Un movimiento idéntico se guardó recientemente. Revisa el historial antes de volver a registrarlo.",true);return;
    }
    state.busy=true;preview();let movementSent=false;
    try{
     const fresh=await getFresh(x);
     const detail="Insumo: "+x.item.name+" ("+x.item.code+")\nOperación: "+x.mode+"\nAnterior: "+fmt(fresh.before)+" "+x.item.unit+"\nCantidad: "+fmt(x.quantity)+" "+x.item.unit+"\nNuevo saldo: "+fmt(fresh.after)+" "+x.item.unit+"\nReferencia: "+x.note+(x.lot?"\nLote: "+x.lot.code+" · Caduca "+x.lot.expiry:"")+"\n\n¿Confirmar?";
     if(!window.confirm(detail))return;
     movementSent=true;
     await saveMovement(x);
     state.lastSaved={signature:sig,at:Date.now()};
     if(x.lot){
      try{await saveLot(x);}catch(error){
       state.pendingLot=x;
       await refreshView();
       notice("La existencia SÍ se actualizó, pero el lote NO quedó confirmado: "+error.message+". Usa «Guardar solamente el lote»; NO repitas la entrada.",true);
       return;
      }
     }
     await refreshView();resetSelection();
     notice("✓ Movimiento registrado. Puedes buscar otro producto.");
    }catch(error){
     if(movementSent){
      state.unknownSingle=true;
      notice("No se pudo confirmar el resultado del movimiento: "+error.message+". Comprueba el historial antes de intentar otra entrada; podría haberse guardado.",true);
     }else notice(error.message,true);
     await refreshView();
    }finally{state.busy=false;preview();}
   });
   $("quick-retry-lot").addEventListener("click",async()=>{
    const x=state.pendingLot;if(!x||state.busy)return;
    state.busy=true;$("quick-retry-lot").disabled=true;
    try{
     await config.refresh();
     await saveLot(x);
     state.pendingLot=null;
     resetSelection();notice("✓ Lote guardado sin volver a sumar existencias.");
     await refreshView();
    }catch(e){notice("No se confirmó el lote: "+e.message+". Revisa lotes antes de reintentar.",true);}
    finally{state.busy=false;$("quick-retry-lot").disabled=false;preview();}
   });
   $("quick-stage").addEventListener("click",()=>{
    const x=getInput();
    if(x.error){notice(x.error,true);return;}
    if(x.mode!=="entrada"){notice("La recepción múltiple solo admite entradas de mercancía.",true);return;}
    if(state.batch.length>=50){notice("Máximo 50 líneas por recepción.",true);return;}
    if(state.batch.some(y=>y.itemId===String(x.item.id))){notice("Este insumo ya está en la recepción. Para corregirlo, quita primero la línea pendiente.",true);return;}
    state.batch.push({itemId:String(x.item.id),name:x.item.name,unit:x.item.unit,base:Number(x.item.quantity),qty:x.quantity,note:x.note,lot:x.lot,status:"pending"});
    resetSelection();renderBatch();
    notice("✓ Producto añadido al borrador. Aún NO se modifican existencias.");
   });
   $("quick-batch-list").addEventListener("click",async e=>{
    const rem=e.target.closest("[data-batch-remove]");
    if(rem&&!state.batchBusy){
     const index=Number(rem.dataset.batchRemove);
     if(state.batch[index]?.status==="pending")state.batch.splice(index,1);
     renderBatch();return;
    }
    const retry=e.target.closest("[data-batch-retry]");
    if(!retry||state.batchBusy)return;
    const line=state.batch[Number(retry.dataset.batchRetry)];
    if(!line||line.status!=="lot_failed")return;
    state.batchBusy=true;renderBatch();
    try{
     await config.refresh();
     const item=itemById(line.itemId);if(!item)throw Error("No se localizó el insumo.");
     await saveLot({item,quantity:line.qty,lot:line.lot});
     line.status="saved";
     notice("✓ Lote pendiente registrado sin repetir entrada.",false,"quick-batch-notice");
     await refreshView();
    }catch(err){notice("El lote sigue pendiente: "+err.message+". Revisa el historial de lotes antes de repetir.",true,"quick-batch-notice");}
    finally{state.batchBusy=false;renderBatch();}
   });
   $("quick-batch-clear").addEventListener("click",()=>{
    if(state.batchBusy)return;
    state.batch=state.batch.filter(x=>x.status!=="saved");
    renderBatch();notice("Se quitaron las líneas completadas. No se modificaron registros anteriores.",false,"quick-batch-notice");
   });
   $("quick-batch-save").addEventListener("click",async()=>{
    if(state.busy||state.batchBusy||state.batch.some(x=>["unknown","lot_failed","moving"].includes(x.status)))return;
    const pending=state.batch.filter(x=>x.status==="pending");
    if(!pending.length)return;
    const detail="Se registrarán "+pending.length+" entrada(s) en orden:\n"+pending.map(x=>"- "+x.name+": "+fmt(x.qty)+" "+x.unit).join("\n")+"\n\nCada registro se guarda por separado y se detiene ante un error. ¿Confirmas?";
    if(!window.confirm(detail))return;
    state.batchBusy=true;renderBatch();
    let success=0;
    for(const line of pending){
     try{
      const item=itemById(line.itemId);
      if(!item)throw Error("Insumo no disponible.");
      if(Number(item.quantity)!==line.base)throw Error("El saldo cambió desde que se agregó al borrador.");
      const x={item,mode:"entrada",quantity:line.qty,note:line.note,lot:line.lot};
      await getFresh(x);
      if(line.lot&&isLotPresent(item.id,line.lot.code))throw Error("El lote ya existe; evita duplicarlo.");
      line.status="moving";renderBatch();
      // If the response is ambiguous, do not retry this movement automatically.
      await saveMovement(x);
      if(line.lot){
       try{await saveLot(x);}catch(err){
        line.status="lot_failed";throw Error("Entrada registrada, pero lote pendiente: "+err.message);
       }
      }
      line.status="saved";success++;
      await config.refresh();
      renderBatch();
     }catch(err){
      if(line.status==="moving")line.status="unknown";
      notice(success+" entrada(s) completadas. Proceso detenido en «"+line.name+"»: "+err.message+". Revisa movimientos antes de repetir; el estado puede ser parcial.",true,"quick-batch-notice");
      break;
     }
    }
    if(state.batch.every(x=>x.status==="saved")){
     notice("✓ Recepción registrada. Revisa el historial de movimientos y lotes.",false,"quick-batch-notice");
    }
    state.batchBusy=false;renderBatch();preview();
   });
   return {render,select:pick};
  }
 };
})();