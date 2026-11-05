const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "..", "fly-control.html"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");

test("Fly pilot requires Fiiller admin role", () => {
  assert.match(page, /FillerCloud\.staffRole\(\)/);
  assert.match(page, /!==["']admin["']/);
});

test("Fly pilot stays read-only and never includes credentials", () => {
  assert.match(page, /FillerCloud\.orders\(\)/);
  assert.doesNotMatch(page, /FillerCloud\.(updateOrder|sendOrderMessage|importCatalog|importExtras|uploadProductPhoto|placeOrder)\s*\(/);
  assert.doesNotMatch(page, /service_role|SUPABASE_SERVICE_ROLE_KEY|password\s*:/i);
});

test("admin menu points to the pilot", () => {
  assert.match(admin, /href="fly-control\.html"/);
});
