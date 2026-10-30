const { chromium }=require("playwright");
const assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=process.cwd(),mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png"};
const server=http.createServer((req,res)=>{
 const name=path.resolve(root,"."+decodeURIComponent((req.url||"/").split("?")[0]));
 if(!name.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(name,(err,buf)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":mime[path.extname(name)]||"application/octet-stream"});res.end(buf);});
});
async function main(){
 await new Promise(resolve=>server.listen(8096,"127.0.0.1",resolve));
 const browser=await chromium.launch();
 try{
  for(const device of [{width:1366,height:900,label:"desktop"},{width:390,height:844,label:"mobile"}]){
   const ctx=await browser.newContext({viewport:device,serviceWorkers:"block"});const page=await ctx.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",async route=>{
    const u=route.request().url();
    let rows=[];
    if(u.includes("filler_products"))rows=[{id:"tpv013",name:"Sándwich de jamón",category:"Sándwiches y más",price:48,stock:20,active:true,image_url:""}];
    await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(rows)});
   });
   await page.goto("http://127.0.0.1:8096/index.html",{waitUntil:"domcontentloaded"});
   await page.locator(".fiiller-promos-empty").waitFor({timeout:15000});
   assert.equal(await page.locator("#promociones .fiiller-feature-card").count(),0);
   await page.locator(".fiiller-promos-empty a").click();
   assert((await page.url()).includes("#menu-list"));
   assert.equal(errors.length,0,errors.join(" | "));
   fs.mkdirSync("artifacts",{recursive:true});
   await page.screenshot({path:"artifacts/fiiller-empty-promos-"+device.label+".png",fullPage:true});
   console.log("PASS "+device.label+": no sample promotions displayed when database has no announcements");
   await ctx.close();
  }
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
