/* Fiiller Café: catálogo local configurable de extras. */
(() => {
  const KEY = "fillerExtras";
  const defaults = [
    {id:"huevo-extra",name:"Huevo extra",price:null,enabled:false},
    {id:"pollo-extra",name:"Pollo extra",price:null,enabled:false},
    {id:"queso-extra",name:"Queso extra",price:null,enabled:false},
    {id:"jamon-extra",name:"Jamón extra",price:null,enabled:false}
  ];
  const list = document.getElementById("extras-list");
  const message = document.getElementById("extras-message");
  if (!list || !message) return;
  const escape = str => String(str??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let extras;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "null");
    extras = Array.isArray(existing) ? existing.filter(e=>e&&typeof e.id==="string") : defaults.map(e=>({...e}));
  } catch { extras = defaults.map(e=>({...e})); }
  function info(text,error=false){message.textContent=text;message.classList.toggle("error",error);message.hidden=false;}
  function render(){
    list.innerHTML=extras.map(e=>
      '<div class="extra-control-row" data-extra-row="'+escape(e.id)+'">'+
      '<label>Extra<input class="extra-name" type="text" maxlength="70" value="'+escape(e.name)+'" required></label>'+
      '<label>Precio adicional (MXN)<input class="extra-price" type="number" min="0" step="0.01" placeholder="Define el precio" value="'+(e.price===null || e.price===undefined?"":escape(e.price))+'"></label>'+
      '<label class="extra-switch"><input class="extra-enabled" type="checkbox" '+(e.enabled?"checked":"")+'> Disponible para clientes</label>'+
      '<button class="secondary" type="button" data-remove-extra="'+escape(e.id)+'">Quitar</button>'+
      '</div>'
    ).join("");
    list.querySelectorAll("[data-remove-extra]").forEach(b=>b.addEventListener("click",()=>{extras=extras.filter(e=>e.id!==b.dataset.removeExtra);render();info("Extra eliminado de la edición. Presiona Guardar extras para confirmar.");}));
  }
  document.getElementById("add-extra").addEventListener("click",()=>{
    const id="extra-"+Date.now()+"-"+Math.floor(Math.random()*1000);
    extras.push({id,name:"Nuevo extra",price:null,enabled:false});render();info("Completa el nombre y precio antes de activar.");
  });
  document.getElementById("save-extras").addEventListener("click",()=>{
    const rows=[...list.querySelectorAll("[data-extra-row]")];
    const next=[];
    for(const row of rows){
      const name=row.querySelector(".extra-name").value.trim().replace(/\s+/g," ");
      const input=row.querySelector(".extra-price").value;
      const enabled=row.querySelector(".extra-enabled").checked;
      const price=input.trim()===""?null:Number(input);
      if(!name || name.length>70){info("Todos los extras deben tener nombre válido.",true);return;}
      if(price!==null && (!Number.isFinite(price)||price<0)){info("El precio no puede ser negativo.",true);return;}
      if(enabled && price===null){info('Indica el precio del extra "'+name+'" para poder activarlo. Usa 0 solo si será gratis.',true);return;}
      if(next.some(x=>x.name.toLowerCase()===name.toLowerCase())){info("Hay nombres de extras duplicados.",true);return;}
      next.push({id:row.dataset.extraRow,name,price,enabled});
    }
    try{localStorage.setItem(KEY,JSON.stringify(next));extras=next;render();info("Extras guardados. Puedes probarlos en el menú público usando este mismo navegador.");}
    catch(err){info("No se pudieron guardar los extras en este navegador.",true);}
  });
  render();
})();