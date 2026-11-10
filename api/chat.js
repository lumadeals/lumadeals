import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "luma-deals";

/* Models to try in order. gemini-3.8-flash is the one the Gemini API
   itself recommends, but it can return 503 (high demand); gemini-2.0-flash
   is the fallback workhorse. */
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

async function generateWithFallback(ai, contents) {
  let lastError = null;

  for (const model of MODELS) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [searchProductsTool] }]
        }
      });
    } catch (error) {
      lastError = error;
      console.error(`Model ${model} failed:`, error?.message || error);
    }
  }

  throw lastError || new Error("AI request failed.");
}

const ALLOWED_ORIGINS = [
  "https://ai.lumadeals.shop",
  "https://www.lumadeals.shop",
  "https://lumadeals.shop"
];

function setCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://ai.lumadeals.shop"
    );
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

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

async function loadProducts() {
  const url =
    `https://firestore.googleapis.com/v1/projects/` +
    `${PROJECT_ID}/databases/(default)/documents/products`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load Luma Deals products.");
  }

  const data = await response.json();
  const documents = data.documents || [];

  return documents.map((doc) => {
    const product = convertFields(doc.fields || {});

    return {
      id: doc.name?.split("/").pop() || "",
      name: product.name || product.title || "",
      price: product.price ?? "",
      oldPrice: product.oldPrice ?? product.old_price ?? "",
      category: product.category || "",
      image:
        product.img ||
        product.image ||
        (Array.isArray(product.images) ? product.images[0] : "") ||
        "",
      stock: product.stock ?? product.quantity ?? "",
      ...product
    };
  });
}

function searchProducts(products, query) {
  const q = String(query || "").toLowerCase().trim();

  if (!q) return [];

  const words = q.split(/[^a-z0-9\u0600-\u06FF]+/).filter(Boolean);

  const scored = products
    .map((product) => {
      const hay = [
        product.name,
        product.title,
        product.category,
        product.subcategory,
        product.description,
        product.brand,
        product.tags
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;

      for (const word of words) {
        if (hay.includes(word)) score += 1;
      }

      if (hay.includes(q)) score += 2;

      return { product, score };
    })
    .filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map((item) => item.product);
}

const SYSTEM_INSTRUCTION = `
You are LumaDeals AI, the official intelligent shopping assistant of Luma Deals.

Your name is ALWAYS "LumaDeals AI".

LumaDeals AI is developed by ARID Developers.

Founder & CEO:
If anyone asks who the founder or CEO of ARID Developers is, answer exactly:
"Abdul Rehman Imtiaz."

Founder of LumaDeals AI:
If anyone asks who founded LumaDeals AI, answer:
"LumaDeals AI was founded by Abdul Rehman Imtiaz."

IMPORTANT:
- Never provide a full form for "ARID".
- Never say that ARID stands for "Abdul Rehman Imtiaz David."
- Do not invent any other founder, CEO, owner, developer, or company information.
- Keep the answer clear and direct when asked about the founder or CEO.
Do not give any other expansion of ARID.
You are NOT ChatGPT.
You are NOT Google Assistant.
Do not say that Google created you.
Do not claim to be a human.

Your job is to help customers shop on Luma Deals, an online shopping store in Pakistan.
Cash on Delivery (COD) is available nationwide, with delivery across Pakistan.

IMPORTANT PRODUCT RULE:
Whenever the customer asks about a product, category, subcategory, price, discount, stock, availability, or asks to find/show products, you MUST use the search_products tool.

Never invent products, prices, discounts, stock quantities, ratings, or product details.

After receiving product data from search_products:
- Use only the returned product information.
- Mention real product names and prices.
- Mention discounts when available.
- Mention stock when useful.
- If products are found, tell the customer what was found.
- If no products are found, honestly say that no matching products were found.

Language:
Reply naturally in the same language/style used by the customer.
You can understand Urdu, Roman Urdu, English and mixed Urdu-English.

Style:
- Friendly
- Professional
- Natural
- Short and conversational
- Do not sound robotic
- Do not read long product descriptions unless asked
`;

const searchProductsTool = {
  name: "search_products",
  description:
    "Searches the Luma Deals live product inventory. MUST be used whenever the customer asks about products, categories, prices, watches, phones, electronics, fashion, beauty, kitchen items, availability, stock, discounts, or asks to show/find products.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description:
          "Product name, category, subcategory, brand, or search phrase. Examples: watches, phones, men's watches, electronics."
      }
    },
    required: ["query"]
  }
};

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history)
      ? req.body.history
      : [];

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "AI is not configured. Please try again later."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const contents = [];

    for (const item of history.slice(-20)) {
      const text = String(item?.text || "").trim();

      if (!text) continue;

      contents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text }]
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    let response = await generateWithFallback(ai, contents);

    let foundProducts = [];

    for (let round = 0; round < 2; round++) {
      const calls = response.functionCalls;

      if (!calls || calls.length === 0) break;

      const functionResponseParts = [];

      for (const call of calls) {
        if (call.name !== "search_products") continue;

        const query = String(call.args?.query || message);

        let results = [];

        try {
          const products = await loadProducts();
          results = searchProducts(products, query);
        } catch (searchError) {
          console.error("Product search error:", searchError);
          results = [];
        }

        foundProducts = results;

        functionResponseParts.push({
          functionResponse: {
            name: "search_products",
            response: { products: results }
          }
        });
      }

      if (functionResponseParts.length === 0) break;

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) break;

      contents.push(modelContent);
      contents.push({
        role: "user",
        parts: functionResponseParts
      });

      response = await generateWithFallback(ai, contents);
    }

    const reply =
      response.text ||
      "Sorry, I could not generate a reply. Please try again.";

    return res.status(200).json({
      reply,
      products: foundProducts
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      error: error?.message || "AI request failed."
    });
  }
}
