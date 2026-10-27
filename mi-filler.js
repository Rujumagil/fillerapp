(() => {
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const STORE="filler_customer_session_v1";
const AUTH_RETURN=new URL("./mi-filler.html",window.location.href).href;
const $=id=>document.getElementById(id);
let session=null,profile=null,recoveryAccess=null;
const message=(text,bad=false)=>{const el=$("message");el.hidden=false;el.textContent=text;el.className="notice"+(bad?" error":"");};
const headers=()=>({"apikey":KEY,"Content-Type":"application/json"});
function save(value){session=value;if(value)sessionStorage.setItem(STORE,JSON.stringify(value));else sessionStorage.removeItem(STORE);}
try{session=JSON.parse(sessionStorage.getItem(STORE)||"null");}catch{}
async function auth(path,body){
const res=await fetch(BASE+"/auth/v1/"+path,{method:"POST",headers:headers(),body:JSON.stringify(body)});
const json=await res.json().catch(()=>({}));
if(!res.ok)throw Error(json.msg||json.error_description||json.message||"No se pudo completar la solicitud.");
return json;
}
async function token(){
if(!session?.access_token)return null;
if(session.expires_at && session.expires_at<Date.now()/1000+60){
 if(!session.refresh_token){save(null);return null;}
 try{save(await auth("token?grant_type=refresh_token",{refresh_token:session.refresh_token}));}
 catch{save(null);return null;}
}
return session?.access_token||null;
}
async function request(path,{method="GET",body}={}){
const access=await token();if(!access)throw Error("Tu sesión terminó. Inicia sesión de nuevo.");
const res=await fetch(BASE+"/rest/v1/"+path,{method,headers:{...headers(),Authorization:"Bearer "+access, ...(method!=="GET"?{Prefer:"return=representation"}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.message||"No se pudo guardar el perfil.");return data;
}
function tab(which){
$("register").hidden=which!=="register";
$("login").hidden=which!=="login";
$("recover").hidden=which!=="recover";
$("new-password").hidden=which!=="new-password";
$("tab-register").className=which==="register"?"":"secondary";
$("tab-login").className=which==="login"?"":"secondary";
}
$("tab-register").addEventListener("click",()=>tab("register"));
$("tab-login").addEventListener("click",()=>tab("login"));
$("forgot-link").addEventListener("click",()=>{
  $("recover").elements.email.value=$("login").elements.email.value.trim();
  tab("recover");
});
$("back-login").addEventListener("click",()=>tab("login"));
$("recover").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector("button[type=submit]");
  button.disabled=true;
  try{
    const email=form.elements.email.value.trim();
    const response=await fetch(BASE+"/auth/v1/recover?redirect_to="+encodeURIComponent(AUTH_RETURN),{
      method:"POST",headers:headers(),
      body:JSON.stringify({email})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.msg||data.error_description||data.message||"No se pudo enviar la recuperación.");
    message("Si tu correo está registrado, recibirás un enlace para recuperar tu contraseña. Revisa también spam y promociones.");
  }catch(err){message(err.message,true);}finally{button.disabled=false;}
});
$("new-password").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector("button[type=submit]");
  const password=form.elements.password.value;
  if(password!==form.elements.confirm_password.value){message("Las contraseñas no coinciden.",true);return;}
  if(!recoveryAccess){message("Enlace de recuperación inválido o vencido. Solicita uno nuevo.",true);return;}
  button.disabled=true;
  try{
    const response=await fetch(BASE+"/auth/v1/user",{
      method:"PUT",headers:{...headers(),Authorization:"Bearer "+recoveryAccess},
      body:JSON.stringify({password})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.msg||data.error_description||data.message||"No se pudo actualizar la contraseña.");
    recoveryAccess=null;history.replaceState(null,"",location.pathname);
    tab("login");
    message("✓ Contraseña actualizada. Ahora inicia sesión con tu nueva contraseña.");
  }catch(err){message(err.message,true);}finally{button.disabled=false;}
});
function editProfile(open){
  const fields=$("profile-edit"),toggle=$("edit-profile"),summary=$("profile-display");
  if(!fields||!toggle)return;
  fields.hidden=!open;
  if(summary)summary.hidden=open;
  toggle.setAttribute("aria-expanded",String(open));
  toggle.textContent=open?"Cerrar edición":"Editar datos";
  const name=$("profile-name-editor");if(name)name.required=open;
  if(open)name?.focus();
}
function updateLastOrder(){
  const link=$("member-orders-link"),description=$("member-orders-description");
  if(!link||!description)return;
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem("filler_last_tracking_v1")||"null");}catch{}
  const tokenValue=String(saved?.token||"");
  const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tokenValue);
  // Este acceso es del navegador actual, no un historial ligado a la cuenta.
  description.textContent=valid?"Ver seguimiento guardado en este dispositivo":"Sin pedidos guardados en este dispositivo";
  if(valid){
    link.href="./pedido.html#token="+encodeURIComponent(tokenValue);
    link.removeAttribute("aria-disabled");link.removeAttribute("tabindex");
    link.classList.remove("is-inactive");
  }else{
    link.removeAttribute("href");link.setAttribute("aria-disabled","true");link.tabIndex=-1;
    link.classList.add("is-inactive");
  }
}
function showMember(){
  $("visitor").hidden=true;$("member").hidden=false;
  const display=String(profile?.full_name||session?.user?.user_metadata?.filler_display_name||"cliente").trim()||"cliente";
  $("member-name").textContent=display;
  $("member-email").textContent=session?.user?.email||"";
  const initials=display.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0].toUpperCase()).join("");
  $("avatar-initials").textContent=initials||"FC";
  $("profile-view-name").textContent=display;
  $("profile-view-email").textContent=session?.user?.email||"—";
  $("profile-view-phone").textContent=profile?.phone||"Sin registrar";
  const f=$("preferences");f.elements.name.value=display;
  f.elements.phone.value=profile?.phone||"";
  f.elements.promotions.checked=!!profile?.promotions_opt_in;
  editProfile(false);
  updateLastOrder();
}
$("edit-profile").addEventListener("click",()=>{
  editProfile($("profile-edit").hidden);
});
$("cancel-profile-edit").addEventListener("click",()=>{
  const f=$("preferences");
  f.elements.name.value=profile?.full_name||"";
  f.elements.phone.value=profile?.phone||"";
  editProfile(false);
});
async function loadProfile(){
const access=await token();
if(!access){$("visitor").hidden=false;$("member").hidden=true;$("temporary-password-required").hidden=true;return;}
// Leer el estado actual desde el servidor; nunca confiar solamente en la sesión guardada.
const accountResponse=await fetch(BASE+"/auth/v1/user",{
  headers:{"apikey":KEY,"Authorization":"Bearer "+access},cache:"no-store"
});
if(!accountResponse.ok)throw Error("Tu sesión necesita actualizarse. Inicia sesión otra vez.");
const currentUser=await accountResponse.json();
session.user=currentUser;save(session);
if(currentUser.app_metadata?.filler_require_password_change===true){
  $("visitor").hidden=true;$("member").hidden=true;
  $("temporary-password-required").hidden=false;
  message("Para seguir usando Mi Fiiller, reemplaza la contraseña temporal que te proporcionó administración.");
  return;
}
$("temporary-password-required").hidden=true;
const rows=await request("filler_customers?select=user_id,full_name,phone,promotions_opt_in&user_id=eq."+encodeURIComponent(session.user.id));
profile=rows?.[0]||null;
if(!profile){
profile={full_name:session.user?.user_metadata?.filler_display_name||"",phone:null,promotions_opt_in:false};
showMember();
message("Completa tus datos desde «Editar datos». Las promociones están desactivadas hasta que las aceptes.");
return;
}
showMember();
}
$("temporary-password-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector("button[type=submit]");
  const password=form.elements.password.value;
  if(password.length<10||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)){
    message("Usa al menos 10 caracteres, incluyendo letras y números.",true);return;
  }
  if(password!==form.elements.confirm_password.value){
    message("Las contraseñas nuevas no coinciden.",true);return;
  }
  button.disabled=true;
  try{
    const access=await token();
    if(!access)throw Error("Tu sesión terminó. Inicia sesión nuevamente.");
    const response=await fetch(BASE+"/functions/v1/filler-clientes-admin",{
      method:"POST",headers:{"apikey":KEY,"authorization":"Bearer "+access,"content-type":"application/json"},
      body:JSON.stringify({action:"complete_temporary_password",password}),
      cache:"no-store"
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw Error(data.error||"No se pudo guardar tu contraseña.");
    form.reset();
    save(null);profile=null;
    $("temporary-password-required").hidden=true;
    $("visitor").hidden=false;$("member").hidden=true;
    tab("login");
    message("✓ Contraseña personal guardada. Ya puedes iniciar sesión con tu nueva contraseña.");
  }catch(error){message(error.message,true)}
  finally{button.disabled=false;}
});
$("register").addEventListener("submit",async e=>{
e.preventDefault();const form=e.currentTarget,button=form.querySelector("button[type=submit]");
button.disabled=true;
try{
const name=form.elements.name.value.trim(),email=form.elements.email.value.trim(),password=form.elements.password.value;
if(name.length<2)throw Error("Ingresa tu nombre completo.");
const accepted=form.elements.promotions.checked;
const response=await auth("signup?redirect_to="+encodeURIComponent(AUTH_RETURN),{email,password,data:{filler_display_name:name}});
if(response.user && Array.isArray(response.user.identities) && response.user.identities.length===0){
  $("login").elements.email.value=email;
  tab("login");
  message("Tu cuenta ya está registrada. Si no recuerdas tu contraseña, haz clic en «¿Olvidaste tu contraseña? Recupérala aquí».");
}else if(response.access_token && response.user){
save(response);
await saveProfile({full_name:name,phone:null,promotions_opt_in:accepted});
await loadProfile();
message("Cuenta creada. Ya puedes administrar tus preferencias.");
}else{
try{sessionStorage.setItem("filler_pending_signup_v1",JSON.stringify({email,name,accepted}));}catch{}
form.reset();tab("login");
$("login").elements.email.value=email;
message("Si es tu primera vez, revisa el correo de activación. Si ya tienes cuenta, inicia sesión. ¿No recuerdas tu contraseña? Haz clic en «¿Olvidaste tu contraseña? Recupérala aquí».");
}
}catch(err){message(err.message,true);}finally{button.disabled=false;}
});
async function saveProfile(data){
const body={user_id:session.user.id,full_name:data.full_name,phone:data.phone||null,
promotions_opt_in:!!data.promotions_opt_in,promotions_consented_at:data.promotions_opt_in?new Date().toISOString():null,updated_at:new Date().toISOString()};
const existing=await request("filler_customers?select=user_id&user_id=eq."+encodeURIComponent(session.user.id));
const rows=await request("filler_customers"+(existing?.length?"?user_id=eq."+encodeURIComponent(session.user.id):""),{method:existing?.length?"PATCH":"POST",body});
profile=rows?.[0]||body;
}
$("login").addEventListener("submit",async e=>{
e.preventDefault();const f=e.currentTarget,button=f.querySelector("button[type=submit]");button.disabled=true;
try{
const data=await auth("token?grant_type=password",{email:f.elements.email.value.trim(),password:f.elements.password.value});
save(data);
let pending=null;
try{pending=JSON.parse(sessionStorage.getItem("filler_pending_signup_v1")||"null");}catch{}
const existing=await request("filler_customers?select=user_id&user_id=eq."+encodeURIComponent(data.user.id));
if(!existing?.length && pending?.email?.toLowerCase()===data.user.email?.toLowerCase()){
await saveProfile({full_name:pending.name,phone:null,promotions_opt_in:pending.accepted});
sessionStorage.removeItem("filler_pending_signup_v1");
}
await loadProfile();
}catch(err){message(err.message,true);}finally{button.disabled=false;}
});
$("preferences").addEventListener("submit",async e=>{
e.preventDefault();const f=e.currentTarget,b=f.querySelector("button[type=submit]");b.disabled=true;
try{await saveProfile({full_name:f.elements.name.value.trim(),phone:f.elements.phone.value.trim(),promotions_opt_in:f.elements.promotions.checked});showMember();message("Preferencias actualizadas.");}
catch(err){message(err.message,true);}finally{b.disabled=false;}
});
$("logout").addEventListener("click",async()=>{const access=await token();if(access)fetch(BASE+"/auth/v1/logout",{method:"POST",headers:{...headers(),Authorization:"Bearer "+access}}).catch(()=>{});save(null);profile=null;$("member").hidden=true;$("visitor").hidden=false;tab("login");message("Sesión cerrada.");});
// El enlace de confirmación de Supabase regresa con los tokens en el fragmento.
async function receiveEmailConfirmation(params){
  const access=params.get("access_token"), refresh=params.get("refresh_token");
  if(params.get("type")!=="signup" || !access || !refresh)return false;
  try{
    const response=await fetch(BASE+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+access},cache:"no-store"});
    if(!response.ok)throw Error("No pudimos validar el enlace de confirmación.");
    const user=await response.json();
    save({access_token:access,refresh_token:refresh,user,expires_at:Math.floor(Date.now()/1000)+Number(params.get("expires_in")||3600)});
    history.replaceState(null,"",location.pathname);
    await loadProfile();
    // Correo adicional de bienvenida con marca Fiiller: jamás envía credenciales ni bloquea el acceso.
    fetch(BASE+"/functions/v1/filler-welcome-email",{
      method:"POST",
      headers:{"apikey":KEY,"authorization":"Bearer "+access,"content-type":"application/json"},
      body:"{}",cache:"no-store"
    }).catch(()=>{});
    message("✓ Tu correo quedó confirmado. Bienvenido a Mi Fiiller. Completa tu perfil si te faltan datos.");
  }catch(error){
    history.replaceState(null,"",location.pathname);
    tab("login");
    message("No pudimos completar la activación. Intenta iniciar sesión o solicita un nuevo enlace.",true);
  }
  return true;
}
const resend=document.createElement("button");
resend.type="button";resend.className="secondary";resend.textContent="Reenviar correo de activación";
resend.style.marginTop="8px";
$("login").appendChild(resend);
resend.addEventListener("click",async()=>{
  const email=$("login").elements.email.value.trim();
  if(!email){message("Primero escribe el correo de tu cuenta.",true);$("login").elements.email.focus();return;}
  resend.disabled=true;
  try{
    const response=await auth("resend",{type:"signup",email,options:{email_redirect_to:AUTH_RETURN}});
    message("Si tu cuenta está pendiente de activación, recibirás un nuevo enlace. Revisa tu bandeja y spam.");
  }catch(error){message("No se pudo solicitar el enlace: "+error.message,true);}
  finally{resend.disabled=false;}
});
const recoveryParams=new URLSearchParams(location.hash.slice(1));
if(recoveryParams.get("type")==="recovery" && recoveryParams.get("access_token")){
  recoveryAccess=recoveryParams.get("access_token");
  history.replaceState(null,"",location.pathname);
  tab("new-password");
  message("Enlace de recuperación confirmado. Crea tu nueva contraseña.");
}else if(recoveryParams.get("error")){
  tab("login");message("El enlace de recuperación venció o no es válido. Solicita uno nuevo.",true);
}
if(!recoveryAccess){receiveEmailConfirmation(recoveryParams).then(handled=>{if(!handled)loadProfile().catch(err=>message("No pudimos recuperar tu perfil: "+err.message,true));});}
})();