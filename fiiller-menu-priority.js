/* Fiiller Café · Jerarquía comercial del menú.
 * Los productos hechos o preparados en cafetería se presentan primero.
 * Bebidas embotelladas y botanas empaquetadas se ofrecen como complementos.
 * NO altera clasificación contable, precios, existencias ni venta.
 */
(()=>{
  "use strict";
  const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLocaleLowerCase("es-MX").replace(/\s+/g," ");
  const retailCategories=new Set([
    "bebidas embotelladas","bebidas envasadas","botanas y dulces",
    "botanas empaquetadas","snacks empaquetados","productos empaquetados"
  ]);
  const preparedPriority=[
    "De la plancha","Sándwiches y más","Bebidas calientes",
    "Bebidas frías","Ensaladas","Frutas y bowls","Panadería",
    "Galletas y repostería"
  ];
  const preparedOrder=new Map(preparedPriority.map((c,i)=>[normalize(c),i]));
  const isComplementCategory=category=>retailCategories.has(normalize(category));
  const isComplementProduct=item=>{
    const explicit=normalize(item?.merchandising_type||item?.sales_type||"");
    if(explicit==="retail"||explicit==="empaquetado")return true;
    if(explicit==="preparado")return false;
    return isComplementCategory(item?.cat||item?.category);
  };
  const compareCategories=(a,b)=>{
    const aExtra=isComplementCategory(a),bExtra=isComplementCategory(b);
    if(aExtra!==bExtra)return aExtra?1:-1;
    const ar=preparedOrder.get(normalize(a))??99,br=preparedOrder.get(normalize(b))??99;
    return ar-br||String(a).localeCompare(String(b),"es");
  };
  window.FiillerMenuPriority=Object.freeze({
    isComplementCategory,isComplementProduct,compareCategories,
    preparedPriority:Object.freeze([...preparedPriority])
  });
})();
