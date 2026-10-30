const {chromium}=require("playwright");
const fs=require("fs"),path=require("path"),http=require("http"),assert=require("node:assert/strict");
const root=process.cwd(),types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp"};
const server=http.createServer((req,res)=>{const url=decodeURIComponent((req.url||"/").split("?")[0]);const filename=path.resolve(root,"."+url);if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(filename,(error,bytes)=>{if(error){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":types[path.extname(filename)]||"application/octet-stream"});res.end(bytes);});});
const id="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",offerId="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
async function run(){
 await new Promise(resolve=>server.listen(8092,"127.0.0.1",resolve));const browser=await chromium.launch({headless:true});
 try{
  for(const mobile of [false,true]){
   const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:930},serviceWorkers:"block"});
   await ctx.addInitScript((id)=>{sessionStorage.setItem("filler_staff_session_v1",JSON.stringify({access_token:"qa-only",expires_at:4102444800,user:{id}}));},id);
   let records=[], uploads=0, writes=0;
   const page=await ctx.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",dialog=>dialog.accept());
   await page.route("https://qwxydjotwhniahaovrff.supabase.co/**",async route=>{
    const request=route.request(),url=new URL(request.url()),method=request.method();let data=[],status=200;
    const json=()=>{try{return JSON.parse(request.postData()||"{}")}catch{return {}}};
    if(url.pathname.includes("/rest/v1/filler_staff"))data=[{user_id:id,role:"admin"}];
    else if(url.pathname.includes("/rest/v1/filler_products"))data=[{id:"fiiller-cafe-8",category:"Bebidas calientes",name:"Café Fiiller 8 oz",price:29,stock:100,image_url:null,active:true}];
    else if(url.pathname.includes("/rest/v1/filler_storefront_features")){
     if(method==="GET")data=records;
     else if(method==="POST"){const row={...json(),id:offerId,created_at:"2026-10-29T00:00:00Z"};records=[row];data=[row];writes++;}
     else if(method==="PATCH"){records=records.map(r=>({...r,...json()}));data=records;writes++;}
    }else if(url.pathname.includes("/storage/v1/object/")){uploads++;data={Key:"filler-product-images/marketing/test.webp"};}
    await route.fulfill({status,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(data)});
   });
   await page.goto("http://127.0.0.1:8092/promociones-admin.html");
   await page.locator("#workspace").waitFor({state:"visible",timeout:15000});
   assert.equal(await page.locator("#login-card").isVisible(),false);
   await page.locator('[name="title"]').fill("Café de temporada");
   await page.locator('[name="description"]').fill("Próximamente en Fiiller");
   await page.locator('[name="eyebrow"]').fill("Novedad");
   await page.locator('[name="product_id"]').selectOption("fiiller-cafe-8");
   await page.locator("#save").click();
   await page.waitForTimeout(500);
   const status=await page.locator("#message").textContent();
   console.log("SAVE QA STATUS:",status,"RECORDS:",records.length,"JS ERRORS:",errors);
   assert.match(status,/Anuncio guardado/,"Saving failed: "+status);
   assert.equal(records.length,1);
   assert.equal(records[0].product_id,"fiiller-cafe-8");
   assert.equal(records[0].is_published,false);
   const file=Buffer.from("RIFFxxxxWEBP");
   await page.locator("#image-file").setInputFiles({name:"promo.webp",mimeType:"image/webp",buffer:file});
   await page.locator("#upload-photo").click();
   await page.getByText("Foto cargada.", {exact:false}).waitFor();
   assert.equal(uploads,1);
   await page.getByRole("button",{name:"Publicar"}).click();
   await page.getByRole("button",{name:"Ocultar"}).waitFor();
   assert.equal(records[0].is_published,true);
   await page.getByRole("button",{name:"Ocultar"}).click();
   await page.getByRole("button",{name:"Publicar"}).waitFor();
   assert.equal(records[0].is_published,false);
   assert.equal(errors.length,0,errors.join("|"));
   await page.screenshot({path:"artifacts/marketing-admin-"+(mobile?"mobile":"desktop")+".png",fullPage:true});
   console.log("PASS "+(mobile?"mobile":"desktop")+": admin -> draft -> catalog link -> upload -> publish -> hide; writes mocked="+writes);
   await ctx.close();
  }
  // Sin inicio de sesión no debe aparecer el editor.
  const ctx=await browser.newContext({serviceWorkers:"block"}),page=await ctx.newPage();
  await page.goto("http://127.0.0.1:8092/promociones-admin.html");
  await page.locator("#login-card").waitFor({state:"visible"});
  assert.equal(await page.locator("#workspace").isVisible(),false);
  console.log("PASS guest: admin workspace hidden");
  await ctx.close();
 }finally{await browser.close();server.close();}
}
fs.mkdirSync("artifacts",{recursive:true});
run().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close();});
