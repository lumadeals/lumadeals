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
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const expireTime =
      new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();

    const newSessionExpireTime =
      new Date(
        Date.now() + 60 * 1000
      ).toISOString();

    const token =
      await ai.authTokens.create({

        config: {

          uses: 1,

          expireTime,

          newSessionExpireTime,

          liveConnectConstraints: {

            model: "gemini-3.8-live",

            config: {

              sessionResumption: {},

              responseModalities: [
                "AUDIO"
              ],

              inputAudioTranscription: {},

              outputAudioTranscription: {}

            }

          }

        }

      });

    if (!token || !token.name) {

      throw new Error(
        "Gemini did not return an ephemeral token."
      );

    }

    return res.status(200).json({
      token: token.name
    });

  } catch (error) {

    console.error(
      "Luma Live Token Error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Unable to create Gemini Live token."
    });

  }

}
