const {chromium}=require("playwright");
const fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const root=process.cwd(),types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const products=[
["sandwich-pollo","Sándwich de pollo","Sándwiches y más",48],
["tpv013","Sándwich de jamón","Sándwiches y más",48],
["verdes-con-pollo","Chilaquiles Verdes con pollo","Chilaquiles",65],
["rojos-con-pollo","Chilaquiles Rojos con pollo","Chilaquiles",65],
["tpv065","Cappuccino Nestlé","Bebidas calientes",38],
["tpv021","Cuernito de jamón y queso","Sándwiches y más",55]
].map(([id,name,category,price])=>({id,name,category,price,stock:100,active:true,image_url:""}));
const server=http.createServer((req,res)=>{const filename=path.resolve(root,"."+decodeURIComponent((req.url||"/").split("?")[0]));if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(filename,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":types[path.extname(filename)]||"application/octet-stream"});res.end(data);});});
async function main(){await new Promise(done=>server.listen(8111,"127.0.0.1",done));fs.mkdirSync("artifacts",{recursive:true});const browser=await chromium.launch();
try{for(const viewport of [{width:1440,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(route.request().url().includes("filler_products")?products:[])}));
await page.goto("http://127.0.0.1:8111/index.html",{waitUntil:"domcontentloaded"});
await page.locator(".filler-family-track .item").first().waitFor({timeout:15000});
const result=await page.locator(".filler-family-track .item").evaluateAll(cards=>cards.map(card=>{
 const b=card.querySelector(".item-add"),p=card.querySelector(".item-bottom .price"),footer=card.querySelector(".item-bottom");if(!b||!p)return {invalid:true};
 const br=b.getBoundingClientRect(),pr=p.getBoundingClientRect(),cr=card.getBoundingClientRect(),fr=footer.getBoundingClientRect();
 const span=b.querySelector("span:last-child"),r=span.getBoundingClientRect();
 return {title:card.querySelector("h3")?.textContent||"",buttonText:span.textContent,buttonWithin:br.left>=cr.left-1 && br.right<=cr.right+1 && br.bottom<=cr.bottom+1,labelWithin:r.left>=br.left-1&&r.right<=br.right+1&&r.bottom<=br.bottom+1,separateRows:br.top>=pr.bottom-1,footerWithin:fr.right<=cr.right+1,buttonWidth:br.width,cardWidth:cr.width};
})));
assert(result.length>=3,"Insufficient products");for(const card of result){assert(!card.invalid,JSON.stringify(card));assert(card.buttonWithin,JSON.stringify(card));assert(card.labelWithin,JSON.stringify(card));assert(card.separateRows,JSON.stringify(card));assert(card.footerWithin,JSON.stringify(card));assert(card.buttonWidth>40,JSON.stringify(card));}
assert.deepEqual(errors,[]);
await page.locator(".filler-family-track").first().scrollIntoViewIfNeeded();
await page.screenshot({path:"artifacts/fiiller-card-footer-"+viewport.label+".png",fullPage:true});
console.log("PASS",viewport.label,result.map(({title,cardWidth,buttonWidth})=>({title,cardWidth,buttonWidth})));
await ctx.close();
}}finally{await browser.close();server.close();}}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1;server.close();});
