const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("promotion cards use catalog SKU instead of client-supplied price",()=>{
 const source=read("storefront-features.js");
 assert.match(source,/fiiller:promo-product/);
 assert.match(source,/productId:r\.product_id/);
 assert.doesNotMatch(source,/detail:\{[^}]*price/);
 assert.match(source,/select=kind,title,description,eyebrow,image_url,sort_order,product_id/);
});
test("promotion actions reuse real cart and check online status and stock",()=>{
 const source=read("extras-storefront.js");
 assert.match(source,/document\.addEventListener\("fiiller:promo-product"/);
 assert.match(source,/window\.FillerOnlineActive/);
 assert.match(source,/state\.menu\.find\(x=>x\.id===productId\)/);
 assert.match(source,/reserved\(productId\)/);
 assert.match(source,/addToCart\(productId\)/);
});
test("coffee variants choose official SKU and price, then extras",()=>{
 const source=read("extras-storefront.js");
 assert.match(source,/function promotionVariants\(product\)/);
 assert.match(source,/function choosePromoSize\(product,variants\)/);
 assert.match(source,/money\(Number\(item\.price\)\)/);
 assert.match(source,/select\.value=firstAvailable\.id/);
 assert.match(source,/addToCart\(selected\.id\)/);
 assert.match(source,/option\.disabled=Number\(item\.stock\)<=reserved\(item\.id\)/);
});
test("promotions admin can only link existing cloud catalog products",()=>{
 const source=read("storefront-features-admin.js");
 assert.match(source,/await FillerCloud\.catalog\(\)/);
 assert.match(source,/catalogProducts\.some\(p=>p\.id===productId\)/);
 assert.match(source,/data\.product_id=productId\|\|null/);
});
test("schema prevents attaching products to upcoming announcements",()=>{
 const sql=read("docs/storefront-feature-product-links.sql");
 assert.match(sql,/references public\.filler_products\(id\)/);
 assert.match(sql,/product_id is null or kind = 'promotion'/);
});
