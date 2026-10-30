const {chromium}=require("playwright"),fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const root=process.cwd(),types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const menu=[
 ["rojos-con-pollo","Chilaquiles Rojos con pollo",65,100],
 ["rojos-con-huevo","Chilaquiles Rojos con huevo",60,100],
 ["chilaquiles-rojos-sencillos","Chilaquiles Rojos sencillos",55,100],
 ["verdes-con-huevo","Chilaquiles Verdes con huevo",60,100],
 ["verdes-con-pollo","Chilaquiles Verdes con pollo",65,100],
 ["verdes-sencillos","Chilaquiles Verdes sencillos",55,100]
].map(([id,name,price,stock])=>({id,name,price,stock,category:"Chilaquiles",active:true,image_url:""}));
const extras=[{id:"tpv111",name:"Extra huevo",price:12,enabled:true},{id:"tpvs071",name:"Extra aguacate",price:18,enabled:true}];
const server=http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(req.url.split("?")[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream"});res.end(data);});});
async function main(){await new Promise(r=>server.listen(8094,"127.0.0.1",r));fs.mkdirSync("artifacts",{recursive:true});const browser=await chromium.launch();
try{for(const viewport of [{width:1440,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>{
  const url=route.request().url(),body=url.includes("filler_products")?menu:url.includes("filler_extras")?extras:[];
  return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(body)});
 });
 await page.goto("http://127.0.0.1:8094/index.html",{waitUntil:"domcontentloaded"});
 const red=page.locator(".item").filter({hasText:"Chilaquiles Rojos"}).first();
 const card=page.locator(".item").filter({hasText:"Chilaquiles Verdes"}).first();
 await card.waitFor({timeout:15000});
 assert.equal(await page.locator(".item").filter({hasText:"Chilaquiles"}).count(),2,"Must show separate red and green cards");
 assert.equal(await red.count(),1,"Missing red card");
 await card.locator("[data-add]").click();
 const wizard=page.locator(".fx-chilaquiles-dialog");await wizard.waitFor();
 assert.match(await wizard.locator(".fx-chilaquiles-prompt").textContent(),/Verdes/);
 await wizard.getByRole("button",{name:/Con pollo/}).click();
 await wizard.getByRole("button",{name:"Continuar a extras"}).click();
 const modal=page.locator("#filler-extras-modal");await modal.waitFor({state:"visible"});
 await page.locator("#fx-yes").click();
 await modal.locator('input[data-extra="tpvs071"]').check();
 await page.locator("#fx-confirm").click();
 await page.waitForFunction(()=>document.querySelector("#cart-lines")?.textContent?.includes("Chilaquiles Verdes con pollo"));
 await page.waitForFunction(()=>document.querySelector("#cart-lines")?.textContent?.includes("$83"));
 await page.screenshot({path:"artifacts/chilaquiles-"+viewport.label+".png",fullPage:true});
 assert.equal(errors.length,0,"Runtime JS errors: "+errors.join(" / "));
 console.log("PASS "+viewport.label+" two cards -> verdes -> pollo 65 -> aguacate 18 -> carrito 83");
 await ctx.close();
}}finally{await browser.close();server.close();}}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
