import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Gemini Proxy Route
  app.post("/api/gemini", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key not configured on server." });
    }

    try {
      const { prompt, currentState, schema } = req.body;
      
      const contents = `Set up the metronome for the following request: "${prompt}". 
      Current state: ${JSON.stringify(currentState)}
      Available sound types: classic, woodblock, cowbell, beep, electronic.
      Available subdivisions: 1 (none), 2 (8ths), 3 (triplets), 4 (16ths).
      Available visual styles: geometry, waveform, minimal, pendulum.
      
      Rules:
      - Return only JSON matching the schema.
      - Only include fields that need to change.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to process Gemini request." });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Peak Metronome Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
