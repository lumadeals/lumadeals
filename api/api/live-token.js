import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing"
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,

        expireTime: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(),

        newSessionExpireTime: new Date(
          Date.now() + 60 * 1000
        ).toISOString(),

        liveConnectConstraints: {
          model: "gemini-3.8-live",

          config: {
            responseModalities: ["AUDIO"]
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      token: token.name
    });

  } catch (error) {

    console.error(
      "LIVE TOKEN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error?.message || String(error),
      name: error?.name || "UnknownError"
    });
  }
}

