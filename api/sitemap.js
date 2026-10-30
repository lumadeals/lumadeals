// Dynamic product sitemap for Luma Deals.
// Reads the public products collection (same pattern as api/products.js) and
// emits one indexable URL per live product. No credentials are used.
const PROJECT_ID = "luma-deals";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    // Paginate: Firestore returns one page at a time (default page holds the
    // whole catalog only while it fits). Follow nextPageToken until exhausted
    // so no live product is ever silently dropped from the sitemap.
    let urls = "";
    let pageToken = null;
    let pages = 0;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (pageToken) params.set("pageToken", pageToken);
      const url =
        `https://firestore.googleapis.com/v1/projects/` +
        `${PROJECT_ID}/databases/(default)/documents/products?` +
        params.toString();
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(500).send("Could not load products.");
      }
      const data = await response.json();
      const docs = data.documents || [];
    for (const doc of docs) {
      const fields = doc.fields || {};
      const idField = fields.id;
      const id =
        idField && idField.stringValue !== undefined
          ? idField.stringValue
          : idField && idField.integerValue !== undefined
            ? idField.integerValue
            : null;
      if (id === null || id === "") continue;
      urls +=
        "  <url>\n" +
        "    <loc>https://www.lumadeals.shop/?page=product-detail&amp;id=" +
        esc(encodeURIComponent(String(id))) +
        "</loc>\n" +
        "    <changefreq>weekly</changefreq>\n" +
        "    <priority>0.7</priority>\n" +
        "  </url>\n";
    }
      pageToken = data.nextPageToken || null;
      pages++;
    } while (pageToken && pages < 50);
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls +
      "</urlset>\n";
    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(xml);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Could not load products.");
  }
}
