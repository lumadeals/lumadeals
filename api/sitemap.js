// Product detail routes are client-rendered inside index.html and currently declare the homepage as canonical. Do not publish query URLs as product canonicals until each product has a distinct crawlable URL and matching canonical metadata.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
}
