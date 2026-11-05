"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createSimulator}=require("./warehouse-consumption-engine.cjs");
function fixture() {
  const root=path.resolve(__dirname,"..","recetas");
  return [
    "REC-001-chilaquiles-rojos-sencillos.json",
    "REC-002-chilaquiles-rojos-con-huevo.json",
    "REC-003-chilaquiles-rojos-con-pollo.json"
  ].map(name=>JSON.parse(fs.readFileSync(path.join(root,name),"utf8")));
}
function approx(actual,expected) {
  assert.ok(Math.abs(actual-expected)<=1e-8,
    "Esperado "+expected+" pero recibido "+actual);
}
test("Una receta de cada una: 9 SKU y consumos correctos",()=>{
  const simulation=createSimulator(fixture());
  const rows=simulation.compute([
    {recipe_id:"REC-001",quantity:1},{recipe_id:"REC-002",quantity:1},{recipe_id:"REC-003",quantity:1}
  ]);
  const expected={
    "01320026":["kg",.42],"01280238":["pieza",.08],"06010074":["pieza",.0225],
    "06040154":["kg",.09],"05020205":["kg",.03],"05020162":["kg",.015],
    "03050031":["kg",100/.875/1000],"01170024":["kg",.0532],"01010051":["pieza",.003]
  };
  assert.equal(rows.length,9);
  for(const row of rows) {
    assert.ok(expected[row.code],"SKU inesperado "+row.code);
    assert.equal(row.unit,expected[row.code][0]);
    approx(row.amount,expected[row.code][1]);
  }
});
test("Reintentos del mismo folio no duplican consumo",()=>{
  const sim=createSimulator(fixture()),items=[{recipe_id:"REC-003",quantity:2}];
  assert.equal(sim.apply("FIILLER-TEST-0001",items).status,"simulated");
  assert.equal(sim.apply("FIILLER-TEST-0001",items).status,"duplicate_ignored");
  assert.equal(sim.snapshot().journal.length,1);
  assert.throws(()=>sim.apply("FIILLER-TEST-0001",[{recipe_id:"REC-003",quantity:1}]),/contenido distinto/);
});
test("Cancelación revierte solo consumo simulado y no se aplica doble",()=>{
  const sim=createSimulator(fixture());
  sim.apply("FIILLER-TEST-0002",[{recipe_id:"REC-001",quantity:1}]);
  assert.equal(sim.cancel("FIILLER-TEST-0002").status,"simulated_reversal");
  assert.equal(sim.cancel("FIILLER-TEST-0002").status,"duplicate_cancellation_ignored");
  for(const row of sim.snapshot().theoretical_net_consumption)approx(row.amount,0);
  assert.equal(sim.snapshot().journal.length,2);
  assert.throws(()=>sim.cancel("NO-EXISTE"),/No existe/);
});
test("Seguridad: sin API, sin escrituras y rechaza SKU desconocido",()=>{
  const recipes=fixture();
  const sim=createSimulator(recipes);
  const snap=sim.snapshot();
  assert.equal(snap.mode,"simulation_only");
  assert.equal(snap.writes_enabled,false);
  assert.equal(snap.stock_mutation_allowed,false);
  recipes[0].ingredients[0].inventory_code="99999999";
  assert.throws(()=>sim.compute([{recipe_id:"REC-001",quantity:1}]),/SKU no contemplado/);
});

test("Inventario ficticio: proyectar salidas sin modificar existencias",()=>{
  const sim=createSimulator(fixture());
  const stock=Object.freeze({
    "01320026":5,"01280238":2,"06010074":1,
    "06040154":3,"05020205":2,"05020162":1,
    "03050031":8,"01170024":4,"01010051":2
  });
  const before=JSON.stringify(stock);
  const sale=sim.apply("SIMULACION-REC-001-002-003",[
    {recipe_id:"REC-001",quantity:1},
    {recipe_id:"REC-002",quantity:1},
    {recipe_id:"REC-003",quantity:1}
  ]);
  assert.equal(sale.status,"simulated");
  assert.equal(sale.consumption.length,9);
  const projected=Object.fromEntries(sale.consumption.map(row=>
    [row.code,stock[row.code]-row.amount]
  ));
  assert.ok(Object.values(projected).every(value=>value>=0));
  approx(projected["01320026"],4.58);
  approx(projected["01280238"],1.92);
  approx(projected["01170024"],3.9468);
  approx(projected["01010051"],1.997);
  assert.equal(JSON.stringify(stock),before,"No modificar existencias ficticias");
  assert.equal(sim.cancel("SIMULACION-REC-001-002-003").status,"simulated_reversal");
  assert.ok(sim.snapshot().theoretical_net_consumption.every(row=>Math.abs(row.amount)<1e-8));
  assert.equal(JSON.stringify(stock),before);
});
