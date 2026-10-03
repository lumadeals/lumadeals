
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const expireTime = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const newSessionExpireTime = new Date(
      Date.now() + 60 * 1000
    ).toISOString();

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

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,

        liveConnectConstraints: {
          model: "gemini-3.1-flash-live-preview",

          config: {
            responseModalities: ["AUDIO"],

            tools: [
              {
                functionDeclarations: [
                  searchProductsTool
                ]
              }
            ],

            systemInstruction: {
              parts: [
                {
                  text: `
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

Your job is to help customers shop on Luma Deals.

IMPORTANT PRODUCT RULE:
Whenever the customer asks about a product, category, subcategory, price, discount, stock, availability, or asks to find/show products, you MUST use the search_products tool.

Never invent products, prices, discounts, stock quantities, ratings, or product details.

After receiving product data from search_products:
- Use only the returned product information.
- Mention real product names and prices.
- Mention discounts when available.
- Mention stock when useful.
- Keep voice responses natural and concise.
- If products are found, tell the customer what was found.
- If no products are found, honestly say that no matching products were found.

Examples:

Customer: "Mujhe watches dikhao."
Action: call search_products with query "watches".

Customer: "Watches kitne ki hain?"
Action: call search_products with query "watches".

Customer: "Men's watches hain?"
Action: call search_products with query "men watches".

Customer: "Electronics mein kya hai?"
Action: call search_products with query "electronics".

Language:
Reply naturally in the same language/style used by the customer.
You can understand Urdu, Roman Urdu, English and mixed Urdu-English.

Voice style:
- Friendly
- Professional
- Natural
- Short and conversational
- Do not sound robotic
- Do not read long product descriptions unless asked

Luma Deals is an online shopping store.
`
                }
              ]
            }
          }
        }
      }
    });

    return res.status(200).json({
      token: token.name
    });

  } catch (error) {
    console.error("Live token error:", error);

    return res.status(500).json({
      error: error?.message || "Failed to create Live API token"
    });
  }
}
