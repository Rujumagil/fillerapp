const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "fly-control.html"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");

test("Fly accepts only authorized staff roles", () => {
  assert.match(page, /FillerCloud\.staffRole\(\)/);
  assert.match(page, /roles=\["admin","cocina"\]/);
  assert.match(page, /FillerCloud\.login\(/);
  assert.match(page, /FillerCloud\.logout\(/);
  assert.match(page, /role!==activeRole/);
});
test("Fly separates admin and operator summaries", () => {
  assert.match(page, /role!=="admin"/);
  assert.match(page, /Fly Operativo/);
  assert.match(page, /Fly Admin/);
  assert.match(page, /fly-login/);
});

test("Fly pilot stays read-only and never includes credentials", () => {
  assert.match(page, /FillerCloud\.orders\(\)/);
  assert.doesNotMatch(page, /FillerCloud\.(updateOrder|sendOrderMessage|importCatalog|importExtras|uploadProductPhoto|placeOrder)\s*\(/);
  assert.doesNotMatch(page, /service_role|SUPABASE_SERVICE_ROLE_KEY|password\s*:/i);
});

test("admin menu points to the pilot", () => {
  assert.match(admin, /href="fly-control\.html"/);
});

test("Fly offers logout and account switching even without a session", () => {
  assert.match(page, /id="logout" type="button">Cerrar sesión \/ Cambiar usuario/);
  assert.doesNotMatch(page, /id="logout"[^>]*hidden/);
  assert.match(page, /FillerCloud\.logout\(\)/);
  assert.match(page, /href="pedidos\.html"/);
});
