const PROJECT_ID = "luma-deals";

function getValue(field) {
  if (!field) return "";

  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;

  if (field.arrayValue?.values) {
    return field.arrayValue.values.map(getValue);
  }

  if (field.mapValue?.fields) {
    return convertFields(field.mapValue.fields);
  }

  return "";
}

function convertFields(fields = {}) {
  const result = {};

  for (const [key, value] of Object.entries(fields)) {
    result[key] = getValue(value);
  }

  return result;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/` +
      `${PROJECT_ID}/databases/(default)/documents/products`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Firestore error:", errorText);

      return res.status(500).json({
        error: "Could not load Luma Deals products."
      });
    }

    const data = await response.json();

    const documents = data.documents || [];

    const products = documents.map((doc) => {
      const product = convertFields(
        doc.fields || {}
      );

      return {
        id: doc.name?.split("/").pop() || "",
        ...product
      };
    });

    const query = normalize(
      req.query?.q || ""
    );

    let filteredProducts = products;

    if (query) {
      const words = query
        .split(/\s+/)
        .filter(Boolean);

      filteredProducts = products.filter((product) => {

        const searchableText = normalize([
          product.name,
          product.title,
          product.category,
          product.subcategory,
          product.description,
          product.brand,
          product.tags
        ].join(" "));

        return words.some((word) =>
          searchableText.includes(word)
        );
      });
    }

    return res.status(200).json({
      success: true,
      count: filteredProducts.length,
      products: filteredProducts
    });

  } catch (error) {

    console.error(
      "Products API error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Products API failed."
    });
  }
}
