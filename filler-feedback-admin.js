/* Panel de voz del cliente: solo admin de Fiiller. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const note=(text,bad=false)=>{$("message").textContent=text;$("message").style.color=bad?"#a53d28":"#006241";};
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mean=(rows,field)=>{const values=rows.map(r=>Number(r[field])).filter(n=>n>=1&&n<=5);return values.length?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1):"—";};
async function show(){
 const role=await FillerCloud.staffRole();
 if(role!=="admin"){$("login-card").hidden=false;$("dashboard").hidden=true;note(role?"Solo el administrador puede ver las encuestas.":"Inicia sesión como administrador.");return;}
 let session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
 if(!session?.access_token)throw Error("Inicia sesión nuevamente.");
 $("login-card").hidden=true;$("dashboard").hidden=false;
 const since=new Date(Date.now()-30*86400000).toISOString();
 const res=await fetch(BASE+"/rest/v1/filler_feedback?select=rating,food_rating,speed_rating,improvement,comment,suggested_dish,suggested_product_2,question_ratings,created_at&created_at=gte."+encodeURIComponent(since)+"&order=created_at.desc&limit=1000",{headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token},cache:"no-store"});
 if(!res.ok)throw Error("No se pudieron cargar las encuestas. Revisa la sesión de administrador.");
 const data=await res.json();
 const days=Number($("range").value||15);
 const cutoff=Date.now()-days*86400000;
 const rows=data.filter(x=>new Date(x.created_at).getTime()>=cutoff);
 $("responses").textContent=rows.length;
 $("average").textContent=mean(rows,"rating")+"/5";
 $("food").textContent=mean(rows,"food_rating")+"/5";
 $("speed").textContent=mean(rows,"speed_rating")+"/5";
 const questionLabels=["Amabilidad y respeto del personal","Resolución de dudas y solicitudes","Atención general","Sabor de los alimentos","Frescura y temperatura","Presentación y porciones","Variedad de platillos","Opciones para gustos y necesidades","Puntualidad de entrega","Tiempo total de preparación"];
 $("question-scores").innerHTML=questionLabels.map((label,i)=>{
   const key="q"+(i+1);
   const answers=rows.map(r=>Number(r.question_ratings?.[key])).filter(n=>n>=1&&n<=5);
   const score=answers.length?(answers.reduce((a,b)=>a+b,0)/answers.length).toFixed(1):"—";
   const pct=answers.length?Math.round(answers.reduce((a,b)=>a+b,0)/answers.length*20):0;
   return '<div class="barline" style="grid-template-columns:minmax(180px,1fr) minmax(50px,1fr) 68px"><span style="font-size:13px">'+(i+1)+'. '+escape(label)+'</span><div class="track"><div class="fill" style="width:'+pct+'%"></div></div><strong>'+score+'/5</strong></div>';
 }).join("");
 const distribution=[1,2,3,4,5].map(n=>({n,count:rows.filter(r=>r.rating===n).length}));
 $("distribution").innerHTML=distribution.reverse().map(x=>'<div class="barline"><span>'+x.n+' ★</span><div class="track"><div class="fill" style="width:'+(rows.length?Math.round(100*x.count/rows.length):0)+'%"></div></div><strong>'+x.count+'</strong></div>').join("");
 const improvements=new Map();
 const labels={ninguno:"Todo bien",sabor:"Sabor y preparación",variedad:"Variedad",precio:"Precios",tiempo:"Tiempo de entrega",atencion:"Atención",otro:"Otro"};
 rows.forEach(r=>improvements.set(r.improvement,(improvements.get(r.improvement)||0)+1));
 $("improvements").innerHTML=[...improvements].sort((a,b)=>b[1]-a[1]).map(([key,count])=>'<div class="item"><span>'+escape(labels[key]||key)+'</span><strong>'+count+'</strong></div>').join("")||'<p>Aún no hay respuestas.</p>';
 const dishes=new Map();
 rows.forEach(r=>{for(const value of [r.suggested_dish,r.suggested_product_2]){const item=String(value||"").trim().replace(/\s+/g," ");if(!item)continue;const key=item.toLocaleLowerCase("es-MX");const prev=dishes.get(key);dishes.set(key,{name:prev?.name||item,n:(prev?.n||0)+1});}});
 $("dishes").innerHTML=[...dishes.values()].sort((a,b)=>b.n-a.n).slice(0,12).map(x=>'<div class="item"><span>'+escape(x.name)+'</span><strong>'+x.n+' solicitud'+(x.n===1?"":"es")+'</strong></div>').join("")||'<p>Todavía no hay sugerencias de platillos.</p>';
 $("comments").innerHTML=rows.filter(r=>r.comment).slice(0,30).map(r=>'<div class="comment"><small>'+escape(new Date(r.created_at).toLocaleDateString("es-MX"))+' · '+r.rating+'/5 ★</small><p>'+escape(r.comment)+'</p></div>').join("")||'<p>Sin comentarios en el período.</p>';
 note("Datos actualizados. Opiniones sin información personal.");
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;const button=f.querySelector("button");button.disabled=true;try{const user=f.elements.username.value.trim();if(user.toLowerCase()!=="admin")throw Error("Utiliza la cuenta autorizada de administrador.");await FillerCloud.login(user,f.elements.password.value);await show();}catch(err){note(err.message,true);}finally{button.disabled=false;}});
$("range").addEventListener("change",()=>show().catch(err=>note(err.message,true)));
$("reload").addEventListener("click",()=>show().catch(err=>note(err.message,true)));
show().catch(err=>note(err.message,true));
})();