// Canonical sitemap for Luma Deals.
// Product and SPA query routes currently canonicalize to the homepage, so only
// standalone pages with their own canonical URLs are listed here.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const urls = [
    "https://www.lumadeals.shop/",
    "https://www.lumadeals.shop/luma-ai.html",
    "https://www.lumadeals.shop/privacy.html",
    "https://www.lumadeals.shop/faq.html"
  ];
  const entries = urls.map(url => "  <url><loc>" + url + "</loc></url>").join("\n");
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + '\n</urlset>\n';
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
}
