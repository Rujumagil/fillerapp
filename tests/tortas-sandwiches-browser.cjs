const {chromium}=require("playwright");
const fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const root=process.cwd(),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const menu=[
["tpv018","Torta de jamón",45],["tpv017","Torta de milanesa",55],["tpv020","Torta de salchicha",45],
["tpv013","Sándwich de jamón",48],["sandwich-pollo","Sandwich de pollo",48],["sandwich-atun","Sandwich de atun",55],["tpv016","Sándwich de salchicha",45],
["club-sandwich","Club sandwich Oroweat",115]
].map(([id,name,price])=>({id,name,price,category:"Sándwiches y más",stock:100,active:true,image_url:""}));
const extras=[{id:"tpvs071",name:"Extra aguacate",price:18,enabled:true},{id:"fiiller-tocino",name:"Extra tocino",price:18,enabled:true}];
const server=http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(req.url.split("?")[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream"});res.end(data);});});
async function main(){await new Promise(ok=>server.listen(8095,"127.0.0.1",ok));fs.mkdirSync("artifacts",{recursive:true});const browser=await chromium.launch();
try{for(const viewport of [{width:1440,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(route.request().url().includes("filler_products")?menu:route.request().url().includes("filler_extras")?extras:[])}));
 await page.goto("http://127.0.0.1:8095/index.html",{waitUntil:"domcontentloaded"});
 const tortas=page.locator(".item").filter({has:page.locator("h3", {hasText:"Tortas"})});
 const sandwiches=page.locator(".item").filter({has:page.locator("h3", {hasText:"Sándwiches"})});
 await tortas.waitFor({timeout:12000});
 assert.equal(await tortas.count(),1);
 assert.equal(await sandwiches.count(),1);
 assert.equal(await page.locator(".item").filter({has:page.locator("h3",{hasText:"Club sandwich Oroweat"})}).count(),1);
 await tortas.locator("[data-add]").click();
 let picker=page.locator(".fx-chilaquiles-dialog");await picker.waitFor();
 await picker.getByRole("button",{name:/De milanesa/}).click();
 await picker.getByRole("button",{name:"Continuar a extras"}).click();
 const modal=page.locator("#filler-extras-modal");await modal.waitFor({state:"visible"});
 await page.locator("#fx-yes").click();await modal.locator('input[data-extra="tpvs071"]').check();await page.locator("#fx-confirm").click();
 await page.waitForFunction(()=>document.querySelector("#cart-lines")?.textContent?.includes("Torta de milanesa"));
 await page.waitForFunction(()=>document.querySelector("#cart-lines")?.textContent?.includes("$73"));
 await sandwiches.locator("[data-add]").click();
 picker=page.locator(".fx-chilaquiles-dialog");await picker.waitFor();
 await picker.getByRole("button",{name:/De pollo/}).click();
 await picker.getByRole("button",{name:"Continuar a extras"}).click();
 await modal.waitFor({state:"visible"});await page.locator("#fx-plain").click();
 await page.waitForFunction(()=>document.querySelector("#cart-lines")?.textContent?.includes("Sandwich de pollo"));
 assert.equal(errors.length,0,errors.join(" | "));
 await page.screenshot({path:"artifacts/tortas-sandwiches-"+viewport.label+".png",fullPage:true});
 console.log("PASS "+viewport.label+" Tortas + milanesa + aguacate $73; Sándwiches + pollo $48; club independent");
 await ctx.close();
}}finally{await browser.close();server.close();}}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
