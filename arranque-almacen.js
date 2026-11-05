/* Fiiller Café · conciliación local, lectura solamente. No toca APIs ni almacén. */
(()=>{"use strict";
const $=id=>document.getElementById(id);let rows=[],valid=false,errors=[];
const required=["fecha","folio","codigo_producto","producto","cantidad","importe","estado"];
function csvParse(text){
 const out=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===","||c===";"||c==="\t")){row.push(cell);cell="";}
  else if(!quoted&&(c==="\n"||c==="\r")){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))out.push(row);row=[];cell="";}
  else cell+=c;
 }
 if(quoted)throw Error("Comillas sin cerrar en el CSV");
 row.push(cell);if(row.some(v=>v.trim()))out.push(row);
 return out;
}
function normalize(s){return String(s??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"_");}
function number(s){const n=Number(String(s??"").trim().replace(/\$/g,"").replace(/,/g,""));return Number.isFinite(n)?n:NaN;}
function readLine(tds){const tr=document.createElement("tr");tds.forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.append(td)});return tr;}
function dateOnly(v){const s=String(v||"").trim();const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(iso)return iso[1]+"-"+iso[2]+"-"+iso[3];const local=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);return local?local[3]+"-"+local[2]+"-"+local[1]:"";}
$("file").addEventListener("change",async()=>{
 rows=[];valid=false;errors=[];$("preview").replaceChildren();
 const file=$("file").files[0];if(!file)return;
 if(!/\.csv$/i.test(file.name)||file.size>5*1024*1024){$("file-message").textContent="Usa CSV de hasta 5 MB.";return;}
 try{
  const data=csvParse((await file.text()).replace(/^\uFEFF/,""));
  if(data.length<2)throw Error("Archivo vacío o sin líneas de productos");
  const headers=data[0].map(normalize), missing=required.filter(h=>!headers.includes(h));
  if(missing.length)throw Error("Faltan columnas: "+missing.join(", ")+". Archivo no conciliado.");
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  rows=data.slice(1).map((r,n)=>({line:n+2,fecha:dateOnly(r[idx.fecha]),folio:String(r[idx.folio]||"").trim(),codigo:String(r[idx.codigo_producto]||"").trim(),producto:String(r[idx.producto]||"").trim(),cantidad:number(r[idx.cantidad]),importe:number(r[idx.importe]),estado:normalize(r[idx.estado]),sucursal:idx.sucursal===undefined?"":String(r[idx.sucursal]||"").trim(),linea:idx.linea_id===undefined?"":String(r[idx.linea_id]||"").trim()}));
  errors=rows.filter(r=>!r.fecha||!r.folio||!r.codigo||!r.producto||!Number.isFinite(r.cantidad)||!Number.isFinite(r.importe)||!r.estado).map(r=>"Fila "+r.line+" incompleta");
  valid=errors.length===0;
  $("file-message").textContent=valid?rows.length+" líneas leídas. Solo vista previa; ningún movimiento enviado.":errors.slice(0,8).join("; ");
  for(const r of rows.slice(0,30))$("preview").append(readLine([r.fecha,r.folio,r.producto,r.cantidad,r.importe.toFixed(2),r.estado]));
 }catch(e){$("file-message").textContent=e.message;rows=[];valid=false;}
});
$("validate").addEventListener("click",()=>{
 const out=$("results");if(!valid){out.textContent="No se puede conciliar: primero carga CSV válido.";return;}
 const cutoff=$("cutoff").value,confirmed=$("count-confirmed").checked,responsible=$("counter").value.trim();
 const ticketCount=Number($("tickets").value),amount=Number($("sales").value);
 const ticketsPresent=$("tickets").value.trim()!==""&&Number.isSafeInteger(ticketCount)&&ticketCount>=0;
 const salesPresent=$("sales").value.trim()!==""&&Number.isFinite(amount);
 const unique=new Set(rows.map(r=>r.fecha+"|"+r.sucursal+"|"+r.folio));
 const ambiguous=rows.some(r=>!r.sucursal||!r.linea);
 const positive=rows.filter(r=>["venta","pagado","cobrado","paid"].includes(r.estado));
 const unclassified=rows.filter(r=>!["venta","pagado","cobrado","paid","cancelado","devolucion","refund","anulado"].includes(r.estado));
 const importAmount=rows.reduce((a,r)=>a+r.importe,0);
 const newPeriod=rows.filter(r=>r.fecha>="2026-11-05");
 const lines=[
  "Corte de inventario: "+(cutoff||"SIN HORA REGISTRADA"),
  "Responsable: "+(responsible||"Sin registrar"),
  "Conteo terminado: "+(confirmed?"Sí":"NO"),
  "Líneas archivo: "+rows.length+" | Tickets únicos por fecha/sucursal/folio: "+unique.size,
  "Importe de líneas (sin validar impuestos/descuentos): $"+importAmount.toFixed(2),
  "Estados de venta identificados: "+positive.length+" | Estados desconocidos: "+unclassified.length,
  "Líneas con fecha >= 05/11/2026: "+newPeriod.length,
  "Comparación tickets: "+(!ticketsPresent?"SIN DATO":unique.size===ticketCount?"Coinciden":"DIFERENCIA"),
  "Comparación importe: "+(!salesPresent?"SIN DATO":Math.abs(importAmount-amount)<.01?"Coinciden":"DIFERENCIA"),
  "Folio / línea única: "+(ambiguous?"Revisión requerida: falta sucursal o linea_id":"Campos presentes"),
  "Mapa producto Arrow -> receta: PENDIENTE de contrastar contra archivo real",
  "Autorización de descuento: BLOQUEADA. No se enviaron movimientos."
 ];
 if(!cutoff||!confirmed||!responsible)lines.push("Acción: completar y cerrar conteo físico antes de conciliar consumo.");
 if(cutoff)lines.push("Regla: por ahora NO se atribuye una venta del día al periodo posterior al conteo sin hora por ticket.");
 out.textContent=lines.join("\n");out.style.whiteSpace="pre-line";
});
})();
