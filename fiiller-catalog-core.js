const initialMenu=[{id:"chilaquiles-rojos-sencillos",cat:"Chilaquiles",name:"Rojos sencillos",price:55,stock:10},{id:"rojos-con-huevo",cat:"Chilaquiles",name:"Rojos con huevo",price:60,stock:10},{id:"rojos-con-pollo",cat:"Chilaquiles",name:"Rojos con pollo",price:65,stock:10},{id:"verdes-sencillos",cat:"Chilaquiles",name:"Verdes sencillos",price:55,stock:10},{id:"verdes-con-huevo",cat:"Chilaquiles",name:"Verdes con huevo",price:60,stock:10},{id:"verdes-con-pollo",cat:"Chilaquiles",name:"Verdes con pollo",price:65,stock:10},{id:"huevo-mexicana",cat:"De la plancha",name:"Huevo a la mexicana",price:55,stock:8},{id:"huevo-jamon-queso",cat:"De la plancha",name:"Huevo con jamon y queso",price:58,stock:8},{id:"huevos-tocino",cat:"De la plancha",name:"Huevos con tocino",price:65,stock:8},{id:"enchiladas-pollo",cat:"De la plancha",name:"Enchiladas de pollo",price:70,stock:8},{id:"club-sandwich",cat:"Sandwiches y mas",name:"Club sandwich Oroweat",price:115,stock:6},{id:"sandwich-atun",cat:"Sandwiches y mas",name:"Sandwich de atun",price:55,stock:8},{id:"sandwich-pollo",cat:"Sandwiches y mas",name:"Sandwich de pollo",price:48,stock:8},{id:"avocado-toast",cat:"Sandwiches y mas",name:"Avocado toast",price:65,stock:5},{id:"ensalada-pollo",cat:"Ensaladas",name:"Ensalada de pollo",price:85,stock:6},{id:"coctel-fruta",cat:"Frutas y bowls",name:"Coctel de fruta",price:50,stock:10},{id:"parfait",cat:"Frutas y bowls",name:"Parfait",price:52,stock:8},{id:"acai-bowl",cat:"Frutas y bowls",name:"Acai bowl",price:60,stock:8},{id:"hotcakes-frutos-rojos",cat:"Antojo",name:"Hotcakes con frutos rojos",price:54,stock:8},{id:"pan-dulce",cat:"Antojo",name:"Pan de dulce",price:19,stock:12},{id:"americano-12",cat:"Bebidas calientes",name:"Cafe americano 12 oz",price:29,stock:20},{id:"capuchino-12",cat:"Bebidas calientes",name:"Capuchino 12 oz",price:39,stock:20},{id:"latte-12",cat:"Bebidas calientes",name:"Latte 12 oz",price:39,stock:20},{id:"frappe-oreo",cat:"Bebidas frias",name:"Frappe de Oreo",price:58,stock:10},{id:"jugo-naranja",cat:"Bebidas frias",name:"Jugo de naranja",price:40,stock:10},{id:"smoothie-mango",cat:"Bebidas frias",name:"Smoothie de mango",price:55,stock:10}];
    const money=v=>"$"+v.toLocaleString("es-MX");const todayKey=new Date().toISOString().slice(0,10);const state={category:"Todos",menu:(window.FiillerAvailability?.applyProducts(JSON.parse(localStorage.getItem("fillerMenu")||"null")||initialMenu)),cart:(()=>{try{const saved=JSON.parse(sessionStorage.getItem("filler_cart_v1")||"{}");return saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{}}catch{return {}}})(),orders:JSON.parse(localStorage.getItem("fillerOrders")||"[]")};function save(){localStorage.setItem("fillerMenu",JSON.stringify(state.menu));localStorage.setItem("fillerOrders",JSON.stringify(state.orders))}function toast(m){const el=document.getElementById("toast");el.textContent=m;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}function itemById(id){return state.menu.find(i=>i.id===id)}function photoClass(c){const k=c.toLowerCase();if(k.includes("chilaquiles"))return"cakes";if(k.includes("plancha"))return"coffee";if(k.includes("sandwich"))return"toast-photo";if(k.includes("ensalada"))return"bowl";if(k.includes("frutas"))return"bowl";if(k.includes("antojo"))return"cakes";if(k.includes("calientes"))return"coffee";return"bowl"}function canonicalCategory(category){
  const input=String(category||"Otros").trim().replace(/\s+/g," ");
  const key=input.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(key==="bebidas frias")return "Bebidas frías";
  if(key==="sandwiches y mas")return "Sándwiches y más";
  return input;
}function renderFilters(){
  const host=document.getElementById("filters");
  if(!host)return;
  const priority=window.FiillerMenuPriority;
  const categories=[...new Set(state.menu.map(i=>canonicalCategory(i.cat)).filter(c=>c!=="Antojo"))];
  categories.sort(priority?.compareCategories||((a,b)=>String(a).localeCompare(String(b),"es")));
  const prepared=categories.filter(c=>!priority?.isComplementCategory(c));
  const extras=categories.filter(c=>priority?.isComplementCategory(c));
  const nodes=[];
  const addButton=(name,complement=false)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="chip"+(state.category===name?" active":"")+(complement?" fiiller-chip-extra":"");
    button.dataset.cat=name;
    button.textContent=name;
    button.setAttribute("aria-pressed",String(state.category===name));
    button.addEventListener("click",()=>{state.category=name;render()});
    nodes.push(button);
  };
  addButton("Todos");
  addButton("Los más vendidos");
  prepared.forEach(c=>addButton(c));
  if(extras.length){
    const heading=document.createElement("p");
    heading.className="fiiller-filter-extras-heading";
    heading.textContent="Complementos empaquetados";
    nodes.push(heading);
    extras.forEach(c=>addButton(c,true));
  }
  host.replaceChildren(...nodes);
}function fiillerMenuPermitido(i){const n=String(i.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();const cat=String(i.cat||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();if(/hot\s*cakes?|panqueques?/.test(n))return false;if(window.FiillerAvailability?.isChilaquiles(i)||window.FiillerAvailability?.isDiscontinuedProduct(i))return false;return true;}function renderMenu(){const items=(state.category==="Todos"?state.menu:state.menu.filter(i=>i.cat===state.category)).filter(fiillerMenuPermitido);document.getElementById("menu-list").innerHTML=items.map(item=>{const available=item.stock-(state.cart[item.id]||0);const pic=item.image?`style="background-image:url('${item.image}');background-size:contain;background-position:center center;background-repeat:no-repeat;background-color:#fff"`:"";return `<article class="item"><div class="item-photo photo ${photoClass(item.cat)}" data-has-photo="${Boolean(item.image)}" data-photo-key="${item.imageKey||""}" ${pic}></div><h3>${item.name}</h3><div class="meta">${available>0?"Disponible":"Agotado"}</div><div class="price">${money(item.price)}</div><button ${available<=0?"disabled":""} data-add="${item.id}">${available<=0?"Agotado":"Agregar"}</button></article>`}).join("");FillerPhotos.applyImages(document.getElementById("menu-list"));document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToCart(b.dataset.add)))}function addToCart(id){const item=itemById(id);if(!item||!fiillerMenuPermitido(item)||window.FiillerAvailability?.isChickenProduct(item))return toast("Este producto está agotado temporalmente.");if((state.cart[id]||0)>=item.stock)return toast("No hay mas existencia.");state.cart[id]=(state.cart[id]||0)+1;render()}function changeQty(id,d){const next=(state.cart[id]||0)+d;if(next<=0)delete state.cart[id];else state.cart[id]=next;render()}function cartItems(){return Object.entries(state.cart).filter(([id])=>{const product=itemById(id);if(!product||!fiillerMenuPermitido(product)){delete state.cart[id];return false;}return true;}).map(([id,qty])=>({...itemById(id),qty}))}function renderCart(){try{sessionStorage.setItem("filler_cart_v1",JSON.stringify(state.cart));}catch{}const items=cartItems();const qty=items.reduce((s,i)=>s+i.qty,0);const total=items.reduce((s,i)=>s+i.price*i.qty,0);document.getElementById("bubble-count").textContent=qty===1?"1 producto":qty+" productos";document.getElementById("bubble-total").textContent="Ver pedido · "+money(total);document.getElementById("order-bubble").classList.toggle("show",qty>0);document.getElementById("cart-lines").innerHTML=items.length?items.map(i=>`<div class="cart-line"><div><strong>${i.name}</strong><br><span>${money(i.price)} x ${i.qty}</span></div><div class="qty"><button class="secondary" data-qty="${i.id}" data-delta="-1">-</button><b>${i.qty}</b><button class="secondary" data-qty="${i.id}" data-delta="1">+</button></div></div>`).join(""):`<div class="empty">Tu pedido esta vacio.</div>`;document.querySelectorAll("[data-qty]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.qty,Number(b.dataset.delta))));document.getElementById("cart-total").textContent=money(total)}function renderPickupTimes(){
      const select=document.getElementById("pickup-time");
      const dateSelect=document.getElementById("pickup-date");
      const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
      const part=k=>parts.find(x=>x.type===k)?.value||"";
      const today=part("year")+"-"+part("month")+"-"+part("day");
      const tomorrowDate=new Date(today+"T12:00:00Z");tomorrowDate.setUTCDate(tomorrowDate.getUTCDate()+1);
      const tomorrow=tomorrowDate.toISOString().slice(0,10);
      const current=Number(part("hour"))*60+Number(part("minute"));
      const selectedTomorrow=dateSelect?.value==="tomorrow";
      const target=selectedTomorrow?tomorrow:today;
      const slots=[], added=new Set();
      const addSlot=(minuteOfDay,delay=0)=>{
        if(minuteOfDay<8*60||minuteOfDay>16*60+30)return;
        if(added.has(minuteOfDay)){
          const existing=slots.find(x=>x.minuteOfDay===minuteOfDay);
          if(existing&&delay)existing.delay=delay;
          return;
        }
        const hour=Math.floor(minuteOfDay/60),minute=minuteOfDay%60;
        const time=String(hour).padStart(2,"0")+":"+String(minute).padStart(2,"0");
        slots.push({value:target+" "+time,label:time+" h",minuteOfDay,delay});
        added.add(minuteOfDay);
      };
      if(selectedTomorrow||current<16*60){
        for(let hour=8;hour<=16;hour++)for(const minute of [0,30]){
          const value=hour*60+minute;
          if(selectedTomorrow||value>=current+10)addSlot(value);
        }
        // Horarios exactos para recoger en 15, 20 o 30 minutos (no se redondean).
        // No se ofrecen para mañana ni después del cierre de pedidos de hoy.
        if(!selectedTomorrow)for(const delay of [15,20,30])addSlot(current+delay,delay);
      }
      const previous=select.value;
      // Mantener una selección rápida válida aunque los minutos del reloj avancen.
      // Rechazarla únicamente si ya no cumple los 10 minutos de anticipación.
      if(!selectedTomorrow&&previous.startsWith(target+" ")){
        const hm=previous.slice(target.length+1).match(/^(\d{2}):(\d{2})$/);
        if(hm){
          const timeValue=Number(hm[1])*60+Number(hm[2]);
          if(timeValue>=current+10&&timeValue<=16*60+30)addSlot(timeValue);
        }
      }
      slots.sort((a,b)=>a.minuteOfDay-b.minuteOfDay);
      const signature=target+"|"+slots.map(x=>x.value).join("|");
      if(select.dataset.available===signature)return;
      select.dataset.available=signature;
      select.innerHTML=slots.length?slots.map(x=>'<option value="'+x.value+'"'+(x.delay?' data-quick-delay="'+x.delay+'"':'')+'>'+x.label+'</option>').join(""):'<option value="">Sin horarios hoy: elige mañana</option>';
      select.disabled=!slots.length;
      if(previous&&slots.some(x=>x.value===previous))select.value=previous;
      // Si el horario caducó mientras el cliente compraba, exigir una selección nueva.
      else if(previous&&slots.length)select.value="";
      window.dispatchEvent(new Event("fiiller:pickup-options-updated"));
      const note=document.getElementById("pickup-help");
      if(note)note.textContent=selectedTomorrow?"Pedido programado para mañana ("+tomorrow+"). Recogida de 8:00 a 16:30 h.":"Pedidos del día hasta las 16:00 h (hora de Guadalajara). Recolección con mínimo 10 minutos de anticipación.";
    }function sendOrder(){const items=cartItems();const name=document.getElementById("customer-name").value.trim();const phone=document.getElementById("customer-phone").value.trim();if(!items.length)return toast("Agrega al menos un producto.");if(!name||!phone)return toast("Falta nombre y telefono.");items.forEach(l=>itemById(l.id).stock=Math.max(0,itemById(l.id).stock-l.qty));const now=Date.now();const order={id:"F-"+now.toString().slice(-6),date:todayKey,createdAt:new Date(now).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),createdTs:now,statusUpdatedAt:now,customer:name,phone,pickup:document.getElementById("pickup-time").value,notes:document.getElementById("notes").value.trim(),status:"Nuevo",items,total:items.reduce((s,i)=>s+i.price*i.qty,0)};state.orders.unshift(order);state.cart={};save();document.getElementById("client-status").textContent=`Pedido ${order.id} recibido. Te avisaremos al ${phone} cuando este listo.`;document.getElementById("client-status").classList.add("show");toast("Pedido enviado a cocina.");fillerNotify("Pedido recibido",`Tu pedido ${order.id} ya esta en cocina.`);render()}function render(){
  // Una misma categoría jamás debe aparecer dos veces por tildes o espacios.
  for(const item of state.menu)item.cat=canonicalCategory(item.cat);
  if(state.category!=="Todos")state.category=canonicalCategory(state.category);
  renderPickupTimes();renderFilters();renderMenu();renderCart();
}// Los pedidos reales se envían únicamente por storefront-cloud.js; no confirmar órdenes locales.
    function syncMenuFromStorage(){
      if(window.FillerOnlineActive)return;
      try{
        const latest=JSON.parse(localStorage.getItem("fillerMenu")||"null");
        if(!Array.isArray(latest))return;
        state.menu=window.FiillerAvailability?.applyProducts(latest)||latest;
        Object.keys(state.cart).forEach(id=>{
          const product=itemById(id.split('::')[0]);
          if(!product || !Number(product.stock)){delete state.cart[id];return;}
          const allocated=Object.keys(state.cart).filter(k=>k.split('::')[0]===product.id).reduce((sum,k)=>sum+Number(state.cart[k]||0),0);
          if(allocated>Number(product.stock)){state.cart[id]=Math.max(0,Number(state.cart[id])- (allocated-Number(product.stock)));if(!state.cart[id])delete state.cart[id];}
        });
        render();
      }catch(error){console.warn("No se pudo actualizar el menú local.",error);}
    }
    window.addEventListener("storage",event=>{if(event.key==="fillerMenu")syncMenuFromStorage();});
    window.addEventListener("focus",syncMenuFromStorage);
    document.getElementById("pickup-date")?.addEventListener("change",renderPickupTimes);
    render();
    setInterval(renderPickupTimes,60000);
    FillerPhotos.migrateMenu(state.menu).then(changed=>{if(changed)render();}).catch(error=>console.warn("Migración de fotos pendiente:",error));
