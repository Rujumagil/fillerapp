import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";

const BASE = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { return ""; }
})();
const RESEND = Deno.env.get("FILLER_RESEND_API_KEY") || "";
const origins = new Set(["https://fiillercafe.app", "https://www.fiillercafe.app", "https://rujumagil.github.io"]);
const encoder = new TextEncoder();
const headers = (origin: string) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://fiillercafe.app",
  "Access-Control-Allow-Headers": "apikey,content-type,authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
});
const respond = (origin: string, status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers: headers(origin) });
const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hex = (arr: ArrayBuffer) => Array.from(new Uint8Array(arr)).map(x => x.toString(16).padStart(2, "0")).join("");
async function digest(value: string) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
async function codeDigest(email: string, code: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(SERVICE), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode("fiiller-survey:" + email + ":" + code)));
}
const admin = createClient(BASE, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
function monthWindow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const field = (type: string) => parts.find(x => x.type === type)?.value || "";
  return field("year") + "-" + field("month") + "-" + field("day");
}
const safe = (s: string) => s.replace(/[&<>"']/g, x => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
} as Record<string, string>)[x]);

Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST" || !origins.has(origin)) return respond(origin, 403, "Acceso no permitido.");
  if (!BASE || !SERVICE || !RESEND) return respond(origin, 503, "No es posible enviar la verificación por ahora.");
  let body: Record<string, unknown>;
  try {
    if (Number(req.headers.get("content-length") || 0) > 10000) return respond(origin, 413, "Solicitud demasiado larga.");
    body = await req.json();
  } catch { return respond(origin, 400, "Solicitud inválida."); }
  const email = normalize(body.email);
  if (!validEmail(email)) return respond(origin, 400, "Escribe un correo electrónico válido.");
  const action = String(body.action || "");
  const respondentName = String(body.name || "").trim().replace(/\s+/g, " ");
  try {
    if (action === "send_code") {
      if (respondentName.length < 2 || respondentName.length > 60) {
        return respond(origin, 400, "Escribe un nombre de entre 2 y 60 caracteres, sin necesidad de apellidos.");
      }
      const hash = await digest(email);
      const bucket = Math.floor(Date.now() / 180000); // Una solicitud por correo cada 3 minutos.
      const rate = await admin.from("filler_auth_email_rate_limits")
        .insert({ rate_key: "feedback-code:" + hash + ":" + bucket });
      if (rate.error) return respond(origin, 429, "Espera unos minutos antes de solicitar otro código.");

      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
      const code_digest = await codeDigest(email, code);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const stored = await admin.from("filler_feedback_email_challenges")
        .upsert({ email, respondent_name: respondentName, code_digest, expires_at, attempts: 0, created_at: new Date().toISOString(), verified_at: null }, { onConflict: "email" });
      if (stored.error) {
        console.error("Fiiller survey challenge storage", stored.error.code);
        return respond(origin, 503, "No pudimos preparar la verificación.");
      }
      const html = '<html lang="es"><body style="background:#f6f2e9;font:16px Arial,sans-serif;padding:22px;color:#183c2c">' +
        '<div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden">' +
        '<div style="background:#006241;text-align:center;padding:20px"><img src="https://fiillercafe.app/assets/filler-logo-oficial.webp" alt="Fiiller Café" width="140"></div>' +
        '<div style="padding:28px"><h1>Gracias por compartir tu opinión</h1>' +
        '<p>Hola, ' + safe(respondentName) + '.</p>' +
        '<p>Confirma tu correo para enviar tu encuesta de satisfacción. Este código vence en 10 minutos:</p>' +
        '<p style="letter-spacing:8px;font-weight:bold;font-size:31px;text-align:center">' + safe(code) + '</p>' +
        '<p>Si no solicitaste este código, simplemente ignora el mensaje. No se ha creado ninguna cuenta.</p></div></div></body></html>';
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Fiiller Café <hola@fiillercafe.app>", to: [email],
          subject: "Fiiller Café · Código para tu encuesta", html })
      });
      if (!mail.ok) {
        console.error("Fiiller survey email delivery", mail.status);
        await admin.from("filler_feedback_email_challenges").delete().eq("email", email).eq("code_digest", code_digest);
        return respond(origin, 502, "No se pudo enviar el código. Intenta nuevamente más tarde.");
      }
      return respond(origin, 200, "Te enviamos un código de 6 dígitos. Revisa tu correo.");
    }

    if (action === "submit") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) return respond(origin, 400, "Escribe el código de 6 dígitos.");
      const data = body.ratings;
      if (!Array.isArray(data) || data.length !== 10 ||
          !data.every(x => typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= 5)) {
        return respond(origin, 400, "Responde todas las preguntas de 1 a 5 estrellas.");
      }
      const challenge = await admin.from("filler_feedback_email_challenges").select("*").eq("email", email).maybeSingle();
      if (challenge.error || !challenge.data || new Date(challenge.data.expires_at).getTime() < Date.now())
        return respond(origin, 400, "El código venció. Solicita uno nuevo.");
      if (challenge.data.attempts >= 5)
        return respond(origin, 429, "Se agotaron los intentos. Solicita otro código.");
      if (!challenge.data.respondent_name || String(challenge.data.respondent_name).trim().length < 2)
        return respond(origin, 400, "Vuelve a solicitar el código ingresando tu nombre.");
      const expected = await codeDigest(email, code);
      if (expected !== challenge.data.code_digest) {
        await admin.from("filler_feedback_email_challenges").update({ attempts: challenge.data.attempts + 1 }).eq("email", email);
        return respond(origin, 400, "Código incorrecto. Revísalo e intenta de nuevo.");
      }
      const ratings = data as number[];
      const average = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      const cap = (value: unknown, length: number) => String(value || "").trim().slice(0, length) || null;
      const survey_date = monthWindow();
      const payload = {
        user_id: null,
        guest_email: email,
        guest_verified_at: new Date().toISOString(),
        respondent_name: String(challenge.data.respondent_name).trim(),
        survey_date,
        rating: average(ratings),
        food_rating: average(ratings.slice(3, 6)),
        speed_rating: average(ratings.slice(8, 10)),
        improvement: "ninguno",
        question_ratings: Object.fromEntries(ratings.map((value, i) => ["q" + (i + 1), value])),
        comment: cap(body.comment, 500),
        suggested_dish: cap(body.suggested_dish, 120),
        suggested_product_2: cap(body.suggested_product_2, 120),
      };
      const save = await admin.from("filler_feedback").insert(payload);
      if (save.error) {
        if (save.error.code === "23505") return respond(origin, 409, "Este correo ya respondió la encuesta este mes.");
        console.error("Fiiller guest feedback insert", save.error.code);
        return respond(origin, 503, "No pudimos guardar tu encuesta. Intenta de nuevo.");
      }
      await admin.from("filler_feedback_email_challenges").delete().eq("email", email);
      return respond(origin, 200, "¡Gracias! Tu encuesta quedó registrada.");
    }
    return respond(origin, 400, "Acción desconocida.");
  } catch (error) {
    console.error("Fiiller survey unexpected error", String(error).slice(0, 150));
    return respond(origin, 503, "El servicio no está disponible por el momento.");
  }
});
