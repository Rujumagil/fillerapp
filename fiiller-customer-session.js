/* Shared Fiiller customer session for pages outside Mi Fiiller. */
(function(){
 "use strict";
 const KEY="filler_customer_session_v1";
 const API="https://qwxydjotwhniahaovrff.supabase.co";
 const PUBLISHABLE="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
 let refreshing=null;
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||sessionStorage.getItem(KEY)||"null")}catch{return null}}
 function save(data){const value=JSON.stringify(data);try{localStorage.setItem(KEY,value);sessionStorage.setItem(KEY,value)}catch{}}
 async function getSession(){
  const session=read();if(!session?.access_token||!session?.user?.id)return null;
  const now=Math.floor(Date.now()/1000);
  if(!session.expires_at||session.expires_at>now+90)return session;
  if(!session.refresh_token)return null;
  if(!refreshing)refreshing=(async()=>{
   const response=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:PUBLISHABLE,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token}),cache:"no-store"});
   if(!response.ok)throw Error("Tu sesión venció. Vuelve a iniciar sesión en Mi Fiiller.");
   const updated=await response.json();
   if(!updated.access_token||!updated.refresh_token||!updated.user?.id||updated.user.id!==session.user.id)throw Error("No se pudo renovar tu sesión.");
   const next={...session,...updated,expires_at:updated.expires_at||now+Number(updated.expires_in||3600)};
   save(next);return next;
  })().finally(()=>refreshing=null);
  return refreshing;
 }
 window.FiillerCustomerSession=Object.freeze({getSession});
})();