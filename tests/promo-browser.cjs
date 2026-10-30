const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const root=process.cwd();
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".json":"application/json",".svg":"image/svg+xml"};
const menu=[
 {id:"fiiller-cafe-8",category:"Bebidas calientes",name:"Café Fiiller 8 oz",price:29,stock:12,active:true,image_url:""},
 {id:"fiiller-cafe-12",category:"Bebidas calientes",name:"Café Fiiller 12 oz",price:31,stock:12,active:true,image_url:""},
 {id:"fiiller-cafe-16",category:"Bebidas calientes",name:"Café Fiiller 16 oz",price:38,stock:12,active:true,image_url:""},
 {id:"sandwich-pollo",category:"Sándwiches y más",name:"Sándwich de pollo",price:48,stock:10,active:true,image_url:""},
 {id:"pan-dulce",category:"Panadería",name:"Pan de dulce",price:19,stock:0,active:true,image_url:""}
];
const extras=[{id:"fiiller-leche-entera",name:"Leche entera",price:15,enabled:true},{id:"tpv117",name:"Leche deslactosada",price:15,enabled:true},{id:"huevo",name:"Huevo extra",price:12,enabled:true}];
const offers=[
 {kind:"promotion",title:"Prueba de café Fiiller",description:"Elige tu tamaño",eyebrow:"Disponible",product_id:"fiiller-cafe-8",sort_order:1,image_url:null},
 {kind:"promotion",title:"Prueba de sándwich",description:"Elige extras",eyebrow:"Disponible",product_id:"sandwich-pollo",sort_order:2,image_url:null},
 {kind:"promotion",title:"Prueba agotado",description:"No disponible",eyebrow:"Agotado",product_id:"pan-dulce",sort_order:3,image_url:null}
];
const server=http.createServer((req,res)=>{
 const requested=decodeURIComponent((req.url||"/").split("?")[0]),file=path.resolve(root,"."+requested);
 if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,buf)=>{if(e){res.writeHead(404);return res.end("Not found");}res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream"});res.end(buf);});
});
function waitServer(){return new Promise(resolve=>server.listen(8089,"127.0.0.1",resolve));}
async function main(){
 await waitServer();const browser=await chromium.launch({headless:true});const failures=[];
 try{
  for(const size of [{width:1440,height:950,label:"desktop"},{width:390,height:844,label:"mobile"}]){
   const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},serviceWorkers:"block",reducedMotion:"reduce"});
   const page=await ctx.newPage();const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",async route=>{
    const u=new URL(route.request().url());
    let data=[];
    if(u.pathname.includes("/filler_products"))data=menu;
    else if(u.pathname.includes("/filler_extras"))data=extras;
    else if(u.pathname.includes("/filler_storefront_features"))data=offers;
    else if(u.pathname.includes("/auth/"))return route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({message:"No test login"})});
    return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(data)});
   });
   await page.goto("http://127.0.0.1:8089/index.html",{waitUntil:"domcontentloaded"});
   await page.getByText("Prueba de café Fiiller").waitFor({timeout:15000});
   await page.screenshot({path:"artifacts/fiiller-"+size.label+"-promotions.png",fullPage:true});
   const card=page.locator(".fiiller-feature-card").filter({hasText:"Prueba de café Fiiller"});
   await card.getByRole("button",{name:/Elegir producto/}).click();
   const picker=page.locator(".fiiller-promo-size-dialog");
   await picker.waitFor();
   const opts=await picker.locator("select option").allTextContents();
   assert(opts.some(s=>s.includes("8 oz")&&s.includes("$29")),"8 oz price missing");
   assert(opts.some(s=>s.includes("12 oz")&&s.includes("$31")),"12 oz price missing");
   assert(opts.some(s=>s.includes("16 oz")&&s.includes("$38")),"16 oz price missing");
   await picker.locator("select").selectOption("fiiller-cafe-12");
   await picker.getByRole("button",{name:/Continuar/}).click();
   const extrasModal=page.locator("#filler-extras-modal");
   await extrasModal.waitFor({state:"visible"});
   await page.locator("#fx-yes").click();
   await extrasModal.locator('input[data-extra="fiiller-leche-entera"]').check();
   await page.locator("#fx-confirm").click();
   await page.waitForFunction(() => document.querySelector("#cart-lines")?.textContent?.includes("Café Fiiller 12 oz"));
   await page.waitForFunction(() => document.querySelector("#cart-lines")?.textContent?.includes("$46"));
   const ordinary=page.locator(".fiiller-feature-card").filter({hasText:"Prueba de sándwich"});
   await ordinary.getByRole("button",{name:/Elegir producto/}).click();
   const sandwichPicker=page.locator(".fx-chilaquiles-dialog");
   await sandwichPicker.waitFor({state:"visible"});
   await sandwichPicker.getByRole("button",{name:/De pollo/}).click();
   await sandwichPicker.getByRole("button",{name:"Continuar a extras"}).click();
   await extrasModal.waitFor({state:"visible"});
   await page.locator("#fx-plain").click();
   await page.waitForFunction(() => document.querySelector("#cart-lines")?.textContent?.includes("Sándwich de pollo"));
   const before=await page.locator("#cart-total").textContent();
   const soldout=page.locator(".fiiller-feature-card").filter({hasText:"Prueba agotado"});
   await soldout.getByRole("button",{name:/Elegir producto/}).click();
   const after=await page.locator("#cart-total").textContent();
   assert.equal(before,after,"Sold-out product changed cart");
   assert.equal(errors.length,0,"Page JS errors: "+errors.join(" | "));
   if(size.label==="mobile")await page.evaluate(() => window.openFillerCart?.());
   await page.screenshot({path:"artifacts/fiiller-"+size.label+"-cart.png",fullPage:true});
   console.log("PASS "+size.label+": promo -> size -> milk extra -> cart; sandwich; sold-out refusal");
   await ctx.close();
  }
 }finally{await browser.close();server.close();}
}
fs.mkdirSync("artifacts",{recursive:true});
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
