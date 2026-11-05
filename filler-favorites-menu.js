/* Mi Fiiller: favoritos privados por cuenta. El menú público sigue disponible sin iniciar sesión. */
(() => {
  "use strict";
  const BASE="https://qwxydjotwhniahaovrff.supabase.co";
  const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
  const STORE="filler_customer_session_v1";
  const saved=new Set();
  let currentUser=null,loading=false;
  const authHeaders=token=>({apikey:KEY,Authorization:"Bearer "+token});
  function readSession(){
    try{return JSON.parse(localStorage.getItem(STORE)||sessionStorage.getItem(STORE)||"null");}
    catch{return null;}
  }
  function persistSession(value,originalRefresh){
    try{
      const current=readSession();
      if(current?.refresh_token!==originalRefresh)return;
      const serialized=JSON.stringify(value);
      localStorage.setItem(STORE,serialized);
      sessionStorage.setItem(STORE,serialized);
    }catch{}
  }
  async function verifiedAccount(){
    let account=readSession();
    if(!account?.access_token||!account?.user?.id)return null;
    if(account.expires_at&&account.expires_at<=Math.floor(Date.now()/1000)+60){
      if(!account.refresh_token)return null;
      const refresh=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{
        method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
        body:JSON.stringify({refresh_token:account.refresh_token}),cache:"no-store"
      });
      if(!refresh.ok)return null;
      const update=await refresh.json();
      if(!update?.access_token||!update?.user?.id)return null;
      persistSession({...account,...update},account.refresh_token);
      account=readSession()||update;
    }
    const who=await fetch(BASE+"/auth/v1/user",{headers:authHeaders(account.access_token),cache:"no-store"});
    if(!who.ok)return null;
    const user=await who.json();
    if(user?.id!==account.user.id||user?.app_metadata?.filler_require_password_change===true)return null;
    return {id:user.id,token:account.access_token};
  }
  async function favoritesRequest(path,{method="GET",body}={}){
    const account=await verifiedAccount();
    if(!account)throw Error("Inicia sesión de nuevo en Mi Fiiller.");
    const response=await fetch(BASE+"/rest/v1/"+path,{
      method,headers:{...authHeaders(account.token),"Content-Type":"application/json",...(method!=="GET"?{Prefer:"return=minimal"}:{})},
      body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"
    });
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      throw Error(error.message||"No pudimos actualizar tus favoritos.");
    }
    return method==="GET"?response.json():true;
  }
  function updateButtons(){
    document.querySelectorAll("#menu-list .filler-favorite-toggle").forEach(button=>{
      const id=button.closest(".item")?.querySelector("[data-add]")?.dataset.add;
      if(!id)return;
      const favorite=saved.has(id);
      button.textContent=favorite?"♥":"♡";
      button.setAttribute("aria-pressed",String(favorite));
      button.setAttribute("aria-label",(favorite?"Quitar de":"Guardar en")+" mis favoritos: "+(itemById(id)?.name||"producto"));
      button.title=favorite?"Quitar de mis favoritos":"Guardar en mis favoritos";
    });
  }
  function decorate(){
    document.querySelectorAll("#menu-list article.item").forEach(card=>{
      if(card.querySelector(".filler-favorite-toggle"))return;
      const button=document.createElement("button");
      button.type="button";button.className="filler-favorite-toggle";
      const media=card.querySelector(".item-media")||card;
      media.append(button);
      button.addEventListener("click",async event=>{
        event.preventDefault();event.stopPropagation();
        const id=card.querySelector("[data-add]")?.dataset.add;
        if(!id||loading)return;
        loading=true;button.disabled=true;
        try{
          const account=await verifiedAccount();
          if(!account){
            toast("Inicia sesión en Mi Fiiller para guardar tus favoritos.");
            window.location.href="./mi-filler.html?modo=ingresar";
            return;
          }
          if(currentUser!==account.id){saved.clear();currentUser=account.id;}
          if(saved.has(id)){
            await favoritesRequest("filler_customer_favorites?user_id=eq."+encodeURIComponent(account.id)+"&product_id=eq."+encodeURIComponent(id),{method:"DELETE"});
            saved.delete(id);toast("Se quitó de tus favoritos.");
          }else{
            await favoritesRequest("filler_customer_favorites",{method:"POST",body:{user_id:account.id,product_id:id}});
            saved.add(id);toast("¡Guardado en Mis favoritos!");
          }
          updateButtons();
        }catch(error){toast(error.message||"Inténtalo de nuevo.");}
        finally{loading=false;button.disabled=false;}
      });
      card.querySelector("[data-coffee-size]")?.addEventListener("change",updateButtons);
    });
    updateButtons();
  }
  async function loadFavorites(){
    if(loading)return;
    loading=true;
    try{
      const account=await verifiedAccount();
      saved.clear();
      currentUser=account?.id||null;
      if(account){
        const rows=await favoritesRequest("filler_customer_favorites?select=product_id&user_id=eq."+encodeURIComponent(account.id));
        for(const row of Array.isArray(rows)?rows:[])saved.add(String(row.product_id));
      }
      updateButtons();
    }catch(error){console.warn("No se pudieron cargar Mis favoritos:",error);}
    finally{loading=false;}
  }
  const style=document.createElement("style");
  style.textContent=".item .item-media{position:relative}.item .filler-favorite-toggle{position:absolute;right:9px;top:9px;z-index:2;display:grid;place-items:center;width:39px;height:39px;border:1px solid #d5e3d8;background:#fffffff2;color:#006241;border-radius:50%;font-size:28px;line-height:1;box-shadow:0 4px 12px #143c2720;padding:0}.item .filler-favorite-toggle[aria-pressed=true]{color:#d55631;background:#fff7f0}.item .filler-favorite-toggle:focus-visible{outline:3px solid #f4a35c;outline-offset:2px}";
  document.head.append(style);
  const originalRenderMenu=renderMenu;
  renderMenu=function(...args){const result=originalRenderMenu(...args);decorate();return result;};
  decorate();
  window.addEventListener("pageshow",loadFavorites);
  loadFavorites();
})();
