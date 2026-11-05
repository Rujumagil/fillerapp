/* Fiiller Café: vincular un pedido invitado a la cuenta autenticada.
   Requiere el token privado del pedido Y el teléfono usado al comprar. */
const BASE = Deno.env.get("SUPABASE_URL") || "";
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; }
  catch { return ""; }
})();
const ORIGINS = new Set([
  "https://fiillercafe.app",
  "https://www.fiillercafe.app",
  "https://rujumagil.github.io"
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cors = origin => ({
  "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://fiillercafe.app",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin"
});
const reply = (origin, status, data) =>
  new Response(JSON.stringify(data), { status, headers: cors(origin) });

function normalizedPhone(value) {
  let n = String(value || "").replace(/\D/g, "");
  if (n.length === 13 && n.startsWith("521")) n = n.slice(3);
  else if (n.length === 12 && n.startsWith("52")) n = n.slice(2);
  return n;
}

async function rest(path, method = "GET", body) {
  const response = await fetch(BASE + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: SECRET,
      Authorization: "Bearer " + SECRET,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Data API " + response.status);
  return await response.json().catch(() => null);
}

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, 405, { message: "Método no permitido." });
  if (!ORIGINS.has(origin)) return reply(origin, 403, { message: "Origen no autorizado." });
  if (!BASE || !SECRET) return reply(origin, 503, { message: "Servicio temporalmente no disponible." });

  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return reply(origin, 401, { message: "Inicia sesión en Mi Fiiller." });
  try {
    const identityResponse = await fetch(BASE + "/auth/v1/user", {
      headers: { apikey: SECRET, Authorization: "Bearer " + bearer[1] },
      cache: "no-store"
    });
    if (!identityResponse.ok)
      return reply(origin, 401, { message: "Tu sesión terminó. Inicia sesión nuevamente." });
    const user = await identityResponse.json();
    if (!UUID.test(String(user?.id || "")) || !(user.email_confirmed_at || user.confirmed_at))
      return reply(origin, 403, { message: "Confirma tu correo antes de vincular pedidos." });
    if (user.app_metadata?.filler_require_password_change === true)
      return reply(origin, 403, { message: "Primero cambia tu contraseña temporal." });

    const inputText = await req.text();
    if (inputText.length > 2048)
      return reply(origin, 413, { message: "Solicitud demasiado grande." });
    let input;
    try { input = JSON.parse(inputText); } catch { input = null; }
    const tracking = String(input?.tracking_token || "").trim();
    const phone = normalizedPhone(input?.phone);
    if (!UUID.test(tracking) || phone.length < 8 || phone.length > 15)
      return reply(origin, 400, { message: "Revisa el enlace del pedido y el teléfono." });

    const rows = await rest(
      "filler_orders?tracking_token=eq." + encodeURIComponent(tracking) +
      "&select=id,public_code,phone,customer_user_id,created_at&limit=1"
    );
    const order = Array.isArray(rows) ? rows[0] : null;
    // Respuesta genérica: no revela si el enlace o el teléfono eran incorrectos.
    if (!order || normalizedPhone(order.phone) !== phone)
      return reply(origin, 404, { message: "No pudimos verificar ese pedido con esos datos." });
    if (Date.now() - Date.parse(order.created_at) > 90 * 86400000)
      return reply(origin, 410, { message: "Solo puedes vincular pedidos de los últimos 90 días." });
    if (order.customer_user_id === user.id)
      return reply(origin, 200, { ok: true, already_linked: true, code: order.public_code });
    if (order.customer_user_id)
      return reply(origin, 409, { message: "Este pedido ya está asociado a otra cuenta." });

    // La condición is.null impide que dos cuentas reclamen el mismo pedido.
    const updated = await rest(
      "filler_orders?id=eq." + encodeURIComponent(order.id) + "&customer_user_id=is.null",
      "PATCH", { customer_user_id: user.id }
    );
    if (!Array.isArray(updated) || updated.length !== 1)
      return reply(origin, 409, { message: "Este pedido ya no puede vincularse." });
    return reply(origin, 200, { ok: true, already_linked: false, code: order.public_code });
  } catch {
    console.error("Fiiller guest order claim failed");
    return reply(origin, 503, { message: "No pudimos vincular el pedido. Intenta de nuevo." });
  }
});
