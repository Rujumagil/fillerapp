const {chromium}=require("playwright"),fs=require("fs"),http=require("http"),path=require("path"),assert=require("node:assert/strict");
const root=process.cwd(),types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const catalog=[
{id:"fiiller-cafe-8",name:"Café Fiiller 8 oz",category:"Bebidas calientes",price:29,stock:100,active:true,image_url:""},
{id:"fiiller-cafe-12",name:"Café Fiiller 12 oz",category:"Bebidas calientes",price:31,stock:100,active:true,image_url:""},
{id:"fiiller-cafe-16",name:"Café Fiiller 16 oz",category:"Bebidas calientes",price:38,stock:100,active:true,image_url:""},
{id:"tpv018",name:"Torta de jamón",category:"Sándwiches y más",price:45,stock:100,active:true,image_url:""}];
const server=http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(req.url.split("?")[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream"});res.end(bytes);});});
async function run(){await new Promise(resolve=>server.listen(8112,"127.0.0.1",resolve));const browser=await chromium.launch();fs.mkdirSync("artifacts",{recursive:true});
try{for(const viewport of [{width:1440,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(route.request().url().includes("filler_products")?catalog:[])}));
 await page.goto("http://127.0.0.1:8112/index.html",{waitUntil:"domcontentloaded"});
 const coffee=page.locator(".menu-grid .item").filter({has:page.locator("h3",{hasText:"Café Fiiller"})}).first();
 await coffee.waitFor({timeout:15000});
 assert.equal(await coffee.locator("[data-coffee-size]").count(),1);
 assert.equal(await coffee.locator(".item-bottom .price").count(),0,"A beverage with sizes must not duplicate its displayed price");
 const selector=coffee.locator("[data-coffee-size]");
 let options=await selector.locator("option").allTextContents();
 assert(options.some(v=>v.includes("8 oz")&&v.includes("$29")),options.join(", "));
 assert(options.some(v=>v.includes("12 oz")&&v.includes("$31")),options.join(", "));
 assert(options.some(v=>v.includes("16 oz")&&v.includes("$38")),options.join(", "));
 await selector.selectOption("fiiller-cafe-16");
 assert.equal(await coffee.locator("[data-add]").getAttribute("data-add"),"fiiller-cafe-16");
 assert.equal(await coffee.locator(".item-bottom .price").count(),0);
 const torta=page.locator(".menu-grid .item").filter({has:page.locator("h3",{hasText:"Torta de jamón"})}).first();
 await torta.waitFor();
 assert.equal(await torta.locator(".price").textContent(),"$45");
 assert.equal(errors.length,0,errors.join(" | "));
 await coffee.scrollIntoViewIfNeeded();
 await page.screenshot({path:"artifacts/beverage-size-only-"+viewport.label+".png",fullPage:true});
 console.log("PASS "+viewport.label+": price appears in size select only; products without sizes keep their price");
 await ctx.close();
}}finally{await browser.close();server.close();}}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;server.close();});
