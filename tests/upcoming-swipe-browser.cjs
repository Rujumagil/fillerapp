const { chromium }=require("playwright");
const assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=process.cwd(),types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,"."+decodeURIComponent((req.url||"/").split("?")[0]));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":types[path.extname(file)]||"application/octet-stream"});res.end(data);});
});
const upcoming=[
 {kind:"upcoming",title:"Donas temáticas",description:"Próximamente",eyebrow:"Novedad",image_url:null,sort_order:1,product_id:null},
 {kind:"upcoming",title:"Pastel de zanahoria y pay de queso",description:"Muy pronto",eyebrow:"Novedad",image_url:null,sort_order:2,product_id:null}
];
async function run(){
 await new Promise(resolve=>server.listen(8098,"127.0.0.1",resolve));
 const browser=await chromium.launch();fs.mkdirSync("artifacts",{recursive:true});
 try {
  for(const viewport of [{width:390,height:844,label:"mobile"},{width:1440,height:900,label:"desktop"}]){
   const ctx=await browser.newContext({viewport,serviceWorkers:"block"}),page=await ctx.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(route.request().url().includes("filler_storefront_features")?upcoming:[])}));
   await page.goto("http://127.0.0.1:8098/index.html",{waitUntil:"domcontentloaded"});
   await page.locator("#proximos .fiiller-feature-card").nth(1).waitFor({timeout:14000});
   const cards=page.locator("#proximos .fiiller-feature-card");
   assert.equal(await cards.count(),2);
   const track=page.locator("#proximos .fiiller-discovery-grid");
   const layout=await track.evaluate(el=>({display:getComputedStyle(el).display,overflow:getComputedStyle(el).overflowX,snap:getComputedStyle(el).scrollSnapType,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
   if(viewport.label==="mobile"){
    assert.equal(layout.display,"flex");assert.equal(layout.overflow,"auto");assert.match(layout.snap,/mandatory/);
    assert(layout.scrollWidth>layout.clientWidth,"Carousel must be horizontally scrollable");
    await track.evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:"instant"}));
    await page.waitForFunction(()=>document.querySelector("#proximos .fiiller-discovery-grid").scrollLeft>20);
   }else{assert.equal(layout.display,"grid");}
   assert.deepEqual(errors,[]);
   await page.screenshot({path:"artifacts/upcoming-swipe-"+viewport.label+".png",fullPage:true});
   console.log("PASS "+viewport.label+": upcoming cards layout "+JSON.stringify(layout));
   await ctx.close();
  }
 }finally{await browser.close();server.close();}
}
run().catch(err=>{console.error(err.stack||err);process.exitCode=1;server.close();});
