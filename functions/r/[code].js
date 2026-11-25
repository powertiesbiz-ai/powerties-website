// PowerTiesRefer landing: GET /r/<CODE> on powerties.us
//
// Why this lives here: the referral cookie (ptr_ref) must be set
// first-party on powerties.us, so it has to be set by a response
// from this domain — it cannot be set reliably from the app domain.
// This function records the click, sets that cookie for 90 days,
// then sends the visitor to the PowerTiesRefer app with ?ref=<CODE>.

async function handle(context) {
  let raw = (context.params && context.params.code) || "";
  try { raw = decodeURIComponent(raw); } catch { /* keep raw */ }
  const code = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);

  // No usable code: just go home, no cookie.
  if (!code) {
    return Response.redirect("https://powerties.us/", 302);
  }

  // Fire-and-forget click tracking — the redirect must never
  // fail because tracking failed.
  const secret = context.env && context.env.PTR_WEBHOOK_SECRET;
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["x-ptr-secret"] = secret;
  context.waitUntil(
    fetch("https://n8n.powerties.us/webhook/ptr-click", {
      method: "POST",
      headers,
      body: JSON.stringify({
        code,
        ua: context.request.headers.get("user-agent") || "",
        ts: new Date().toISOString(),
      }),
    }).catch(() => {})
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://powertiesrefer.vercel.app/?ref=${code}`,
      "Set-Cookie": `ptr_ref=${code}; Max-Age=7776000; Path=/; Secure; SameSite=Lax`,
    },
  });
}

export const onRequestGet = handle;
// HEAD (e.g. curl -sI checks) must get the same redirect + cookie,
// not the static-site fallback.
export const onRequestHead = handle;
export const onRequest = handle;
