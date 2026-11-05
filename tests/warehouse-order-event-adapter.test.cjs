"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createIsolatedOrderAdapter}=require("./warehouse-order-event-adapter.cjs");
function adapter(){
 const recipes=["REC-001-chilaquiles-rojos-sencillos.json","REC-002-chilaquiles-rojos-con-huevo.json","REC-003-chilaquiles-rojos-con-pollo.json"]
 .map(name=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","recetas",name),"utf8")));
 return createIsolatedOrderAdapter(recipes);
}
const sale={source:"verified_backend_fixture",type:"sale",order_id:"TEST-PED-1001",
 payment_confirmed:true,fulfillment_status:"Entregado",items:[
 {recipe_id:"REC-001",quantity:1,extras:[]},
 {recipe_id:"REC-002",quantity:1,extras:[]},
 {recipe_id:"REC-003",quantity:1,extras:[]}
]};
test("Pedido de prueba con pago y receta confirmados simula nueve SKU",()=>{
 const a=adapter(),result=a.handle(sale);
 assert.equal(result.status,"simulated");
 assert.equal(result.consumption.length,9);
 assert.equal(a.snapshot().stock_mutation_allowed,false);
 assert.equal(a.snapshot().writes_enabled,false);
});
test("Bloquea pedido sin cobro, preparación abierta o fuente no verificada",()=>{
 for(const patch of [
  {payment_confirmed:false},{fulfillment_status:"Preparando"},
  {source:"public_web_client"}
 ]) {
  const a=adapter();
  assert.throws(()=>a.handle({...sale,...patch}),/Bloqueado|no verificada/);
  assert.equal(a.snapshot().journal.length,0);
 }
});
test("Bloquea productos sin receta, extras y cantidades inválidas",()=>{
 for(const items of [
  [{quantity:1,extras:[]}],
  [{recipe_id:"REC-001",quantity:1,extras:[{name:"huevo"}]}],
  [{recipe_id:"REC-001",quantity:-1,extras:[]}]
 ]) {
  const a=adapter();
  assert.throws(()=>a.handle({...sale,items}),/Bloqueado|inválida/);
  assert.equal(a.snapshot().journal.length,0);
 }
});
test("Reintento no duplica, cancelación autorizada revierte una sola vez",()=>{
 const a=adapter();
 assert.equal(a.handle(sale).status,"simulated");
 assert.equal(a.handle(sale).status,"duplicate_ignored");
 assert.throws(()=>a.handle({source:"verified_backend_fixture",type:"cancel",order_id:sale.order_id,authorized_cancellation:false}),/no autorizada/);
 const cancel={source:"verified_backend_fixture",type:"cancel",order_id:sale.order_id,authorized_cancellation:true};
 assert.equal(a.handle(cancel).status,"simulated_reversal");
 assert.equal(a.handle(cancel).status,"duplicate_cancellation_ignored");
 assert.ok(a.snapshot().theoretical_net_consumption.every(row=>Math.abs(row.amount)<1e-8));
 assert.equal(a.snapshot().journal.length,2);
});
