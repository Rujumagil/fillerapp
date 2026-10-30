const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const code=fs.readFileSync("filler-cloud.js","utf8");
test("admin can use the authorized email with its own authentication identity",()=>{
 assert.match(code,/raw==="proyectocompas\.info@gmail\.com"\?raw/);
 assert.match(code,/const expectedRole=account==="admin"\?"admin":"cocina"/);
});
test("the existing admin and kitchen identities remain supported",()=>{
 assert.match(code,/admin: "filler\.admin@proyectocompas\.com"/);
 assert.match(code,/cocina: "filler\.cocina@proyectocompas\.com"/);
});
