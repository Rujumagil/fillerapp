"use strict";
/* Adaptador de eventos EXCLUSIVAMENTE de pruebas.
 * No lee pedidos reales ni escribe en inventario.
 * Fail-closed: solicita validación de cobro originada del backend y mapeo SKU->receta.
 */
const {createSimulator}=require("./warehouse-consumption-engine.cjs");
function required(ok,message) {if(!ok)throw new Error(message);}
function createIsolatedOrderAdapter(recipes) {
  const simulator=createSimulator(recipes);
  const audits=[];
  function handle(event) {
    required(event&&typeof event==="object","Evento obligatorio");
    const id=event.order_id;
    required(typeof id==="string"&&id.length>0,"Folio de pedido obligatorio");
    required(event.source==="verified_backend_fixture","Fuente de prueba no verificada");
    if(event.type==="sale") {
      required(event.payment_confirmed===true,"Bloqueado: falta confirmación confiable de pago");
      required(event.fulfillment_status==="Entregado","Bloqueado: pedido no entregado");
      required(Array.isArray(event.items)&&event.items.length>0,"Faltan artículos");
      const items=event.items.map(item=>{
        required(typeof item.recipe_id==="string"&&/^REC-00[123]$/.test(item.recipe_id),
          "Bloqueado: artículo sin mapeo de receta");
        required(Number.isSafeInteger(item.quantity)&&item.quantity>0,"Cantidad inválida");
        required(Array.isArray(item.extras)&&item.extras.length===0,
          "Bloqueado: extras no contemplados en la receta");
        return {recipe_id:item.recipe_id,quantity:item.quantity};
      });
      const out=simulator.apply(id,items);
      audits.push({order_id:id,event_type:"sale",result:out.status});
      return out;
    }
    if(event.type==="cancel") {
      required(event.authorized_cancellation===true,"Cancelación no autorizada");
      const out=simulator.cancel(id);
      audits.push({order_id:id,event_type:"cancel",result:out.status});
      return out;
    }
    throw new Error("Evento no reconocido");
  }
  function snapshot(){
    return {...simulator.snapshot(),event_audit:audits.map(x=>({...x}))};
  }
  return Object.freeze({handle,snapshot});
}
module.exports={createIsolatedOrderAdapter};
