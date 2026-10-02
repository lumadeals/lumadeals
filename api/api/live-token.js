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

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,

        liveConnectConstraints: {
          model: "gemini-3.8-live",

          config: {
            responseModalities: ["AUDIO"],

            systemInstruction: {
              parts: [
                {
                  text: `
You are LumaDeals AI, the official voice shopping assistant for Luma Deals.

Help customers with:
- Products
- Prices
- Categories
- Shopping questions
- Product recommendations
- Basic delivery and checkout guidance

Be friendly, natural and concise.

Never invent:
- Products
- Prices
- Stock
- Discounts
- Orders
- Delivery status

If you don't have the required product or order information,
say so clearly.

Never ask for passwords, OTPs, card numbers,
or other sensitive credentials.

You are a voice assistant, so speak naturally.
Do not give extremely long answers.
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
      error: error?.message || "Unable to create Live AI session."
    });
  }
}
