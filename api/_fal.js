// Shared proxy to FAL for the Vercel deployment. The dev server does the same job in
// vite.config.js; here the key comes from the FAL_KEY environment variable.
export function falProxy(path) {
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!process.env.FAL_KEY) return res.status(500).json({ error: "FAL_KEY is not set" });
    const r = await fetch(`https://fal.run/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${process.env.FAL_KEY}` },
      body: JSON.stringify(req.body ?? {}),
    });
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(Buffer.from(await r.arrayBuffer()));
  };
}
