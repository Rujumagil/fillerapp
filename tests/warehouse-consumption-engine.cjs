"use strict";
/**
 * Fiiller: simulador AISLADO de consumos. No usa red, Supabase, DOM ni disco.
 * No modifica existencias ni representa la implementación operativa.
 */

function round(value, places=9) {
  if (!Number.isFinite(value)) throw new Error("Cantidad no finita");
  return Number(value.toFixed(places));
}
function insist(condition, message) { if (!condition) throw new Error(message); }
function consumptionForIngredient(item, recipe) {
  const code = item.inventory_code;
  insist(/^\\d{8}$/.test(code || ""), "Ingrediente sin SKU OCS: " + item.name);
  let amount, unit;
  switch (code) {
    case "01320026": // totopos kg
    case "06040154": // panela kg
    case "05020205": // cebolla kg
    case "05020162": // cilantro kg
      amount = item.quantity / 1000; unit = "kg"; break;
    case "01280238": // salsa roja: bolsa 3000g
      insist(item.purchase_package_g===3000,"Presentación de salsa inesperada");
      amount = item.quantity/3000; unit = "pieza"; break;
    case "06010074": // crema: cubeta 4000g
      insist(item.inventory_package_g===4000,"Presentación de crema inesperada");
      amount = item.quantity/4000; unit = "pieza"; break;
    case "01170024": // huevo: media con cáscara: 53.2g
      insist(item.quantity===1 && item.inventory_stock_weight_basis==="con_cascara_confirmed",
       "Base de pesaje de huevo sin validar");
      insist(item.shell_on_weight_per_piece_g===53.2,"Promedio físico de huevo inesperado");
      amount = item.quantity*item.shell_on_weight_per_piece_g/1000; unit = "kg"; break;
    case "03050031": // pollo crudo convertido de 100g cocidos
      insist(recipe.chicken_cooking_yield?.yield_percent===87.5,"Rendimiento de pollo sin validar");
      amount = (item.quantity/(recipe.chicken_cooking_yield.yield_percent/100))/1000; unit = "kg"; break;
    case "01010051": // aceite 1L
      insist(item.inventory_package_ml===1000,"Presentación de aceite inesperada");
      amount = item.quantity/1000; unit = "pieza"; break;
    default: throw new Error("SKU no contemplado por simulador: "+code);
  }
  insist(amount>0,"Cantidad inválida "+code);
  return {code,unit,amount};
}
function createSimulator(recipeList) {
  insist(Array.isArray(recipeList)&&recipeList.length>0,"Faltan recetas");
  const recipes = new Map();
  for (const recipe of recipeList) {
    insist(/^REC-00[123]$/.test(recipe.id),"Solo REC-001 a REC-003");
    insist(recipe.inventory_deduction_status==="pending_integration","No operar sobre receta habilitada");
    insist(!recipes.has(recipe.id),"Receta duplicada");
    recipes.set(recipe.id,recipe);
  }
  insist(recipes.size===3,"Se requieren las tres recetas");
  const entries = new Map();
  const sum = new Map();
  const journal=[];
  function compute(items) {
    insist(Array.isArray(items)&&items.length>0,"Pedido sin artículos");
    const totals=new Map();
    for(const row of items) {
      insist(row&&Number.isSafeInteger(row.quantity)&&row.quantity>0&&row.quantity<=1000,"Cantidad de venta inválida");
      const recipe=recipes.get(row.recipe_id);
      insist(!!recipe,"Receta desconocida: "+row.recipe_id);
      for(const ingredient of recipe.ingredients) {
        const c=consumptionForIngredient(ingredient,recipe);
        const old=totals.get(c.code);
        insist(!old||old.unit===c.unit,"Unidades incompatibles");
        totals.set(c.code,{code:c.code,unit:c.unit,amount:(old?.amount||0)+c.amount*row.quantity});
      }
    }
    return [...totals.values()].map(c=>({...c,amount:round(c.amount)})).sort((a,b)=>a.code.localeCompare(b.code));
  }
  function signature(items) {
    const normalized=items.map(x=>({recipe_id:x.recipe_id,quantity:x.quantity}))
      .sort((a,b)=>a.recipe_id.localeCompare(b.recipe_id));
    return JSON.stringify(normalized);
  }
  function apply(orderId,items) {
    insist(typeof orderId==="string"&&orderId.length>0,"Folio obligatorio");
    const signatureValue=signature(items),previous=entries.get(orderId);
    if(previous) {
      insist(previous.signature===signatureValue,"Mismo folio con contenido distinto");
      return {status:"duplicate_ignored",order_id:orderId,consumption:previous.consumption};
    }
    const consumption=compute(items);
    entries.set(orderId,{signature:signatureValue,consumption,cancelled:false});
    for(const line of consumption) {
      const old=sum.get(line.code);
      sum.set(line.code,{code:line.code,unit:line.unit,amount:round((old?.amount||0)+line.amount)});
    }
    journal.push({type:"simulate_sale",order_id:orderId,consumption});
    return {status:"simulated",order_id:orderId,consumption};
  }
  function cancel(orderId) {
    const entry=entries.get(orderId);
    insist(entry,"No existe folio para cancelar");
    if(entry.cancelled)return {status:"duplicate_cancellation_ignored",order_id:orderId};
    entry.cancelled=true;
    for(const line of entry.consumption) {
      const old=sum.get(line.code);
      insist(!!old,"Acumulado inconsistente");
      sum.set(line.code,{...old,amount:round(old.amount-line.amount)});
    }
    journal.push({type:"simulate_cancel",order_id:orderId,consumption:entry.consumption});
    return {status:"simulated_reversal",order_id:orderId};
  }
  function snapshot() {
    return {mode:"simulation_only",writes_enabled:false,stock_mutation_allowed:false,
      theoretical_net_consumption:[...sum.values()].sort((a,b)=>a.code.localeCompare(b.code)),
      journal:journal.map(x=>({...x})),orders:entries.size};
  }
  return Object.freeze({compute,apply,cancel,snapshot});
}
module.exports={createSimulator,consumptionForIngredient};
