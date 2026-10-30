const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=process.cwd(),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const server=http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent((req.url||"/").split("?")[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream"});res.end(data);});});
async function main(){await new Promise(resolve=>server.listen(8099,"127.0.0.1",resolve));fs.mkdirSync("artifacts",{recursive:true});const browser=await chromium.launch();
try{for(const viewport of [{width:1440,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
 const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(route.request().url().includes("filler_storefront_features")?[{kind:"upcoming",title:"Donas temáticas",description:"Próximamente",eyebrow:"Novedad",image_url:null,sort_order:1,product_id:null}]:[])}));
 await page.goto("http://127.0.0.1:8099/index.html",{waitUntil:"domcontentloaded"});
 assert.equal(await page.locator("#filler-product-search").count(),0);
 assert.equal(await page.locator("#promociones").count(),0);
 assert.equal(await page.locator('nav a[href="#promociones"]').count(),0);
 assert.equal(await page.locator("#proximos").count(),1);
 await page.locator("#proximos .fiiller-feature-card").waitFor({timeout:15000});
 assert.equal(await page.locator("#proximos .fiiller-feature-card").count(),1);
 assert.equal(await page.locator("#menu-list").count(),1);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"artifacts/fiiller-clean-home-"+viewport.label+".png",fullPage:true});
 console.log("PASS "+viewport.label+" search and promos removed, upcoming and menu preserved");
 await ctx.close();
}}finally{await browser.close();server.close();}}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1;server.close();});
