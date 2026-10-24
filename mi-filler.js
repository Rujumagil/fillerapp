(() => {
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const STORE="filler_customer_session_v1";
const $=id=>document.getElementById(id);
let session=null,profile=null;
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
function tab(which){$("register").hidden=which!=="register";$("login").hidden=which!=="login";$("tab-register").className=which==="register"?"":"secondary";$("tab-login").className=which==="login"?"":"secondary";}
$("tab-register").addEventListener("click",()=>tab("register"));
$("tab-login").addEventListener("click",()=>tab("login"));
function showMember(){
$("visitor").hidden=true;$("member").hidden=false;
$("member-name").textContent=profile.full_name;
$("member-email").textContent=session.user?.email||"";
const f=$("preferences");f.elements.name.value=profile.full_name;f.elements.phone.value=profile.phone||"";f.elements.promotions.checked=!!profile.promotions_opt_in;
}
async function loadProfile(){
const access=await token();if(!access){$("visitor").hidden=false;$("member").hidden=true;return;}
const rows=await request("filler_customers?select=user_id,full_name,phone,promotions_opt_in&user_id=eq."+encodeURIComponent(session.user.id));
profile=rows?.[0]||null;
if(!profile){
profile={full_name:session.user?.user_metadata?.filler_display_name||"",phone:null,promotions_opt_in:false};
$("visitor").hidden=true;$("member").hidden=false;
$("member-name").textContent=profile.full_name||"cliente";
$("member-email").textContent=session.user?.email||"";
const form=$("preferences");form.elements.name.value=profile.full_name;form.elements.phone.value="";form.elements.promotions.checked=false;
message("Completa y guarda tu perfil. Las promociones permanecen desactivadas hasta que las aceptes.");
return;
}
showMember();
}
$("register").addEventListener("submit",async e=>{
e.preventDefault();const form=e.currentTarget,button=form.querySelector("button[type=submit]");
button.disabled=true;
try{
const name=form.elements.name.value.trim(),email=form.elements.email.value.trim(),password=form.elements.password.value;
if(name.length<2)throw Error("Ingresa tu nombre completo.");
const accepted=form.elements.promotions.checked;
const response=await auth("signup",{email,password,data:{filler_display_name:name}});
if(response.access_token && response.user){
save(response);
await saveProfile({full_name:name,phone:null,promotions_opt_in:accepted});
await loadProfile();
message("Cuenta creada. Ya puedes administrar tus preferencias.");
}else{
try{sessionStorage.setItem("filler_pending_signup_v1",JSON.stringify({email,name,accepted}));}catch{}
form.reset();tab("login");
message("Revisa tu correo y confirma la cuenta. Después inicia sesión para completar tu perfil y guardar tus preferencias.");
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
loadProfile().catch(err=>message("No pudimos recuperar tu perfil: "+err.message,true));
})();