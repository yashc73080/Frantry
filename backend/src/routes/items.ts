import express, { Response } from "express";
import Item from "../models/Item";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { generateRecipes } from "./apigen";

const router = express.Router();

// All routes require a valid Firebase ID token
router.use(requireAuth);

// Shared LLM parsing — given raw OCR text, return structured food items
async function parseFoodItemsFromText(ocrText: string): Promise<any[]> {
  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  const prompt = `Extract food product names from this grocery receipt text. For each food item, estimate how many days it will last before expiry.

Receipt text:
${ocrText}

Rules:
- Only include actual food/drink products. Skip: taxes, totals, loyalty points, discounts, store name, dates, payment info.
- Standardize names to title case, remove brand names (e.g. "DOLE BANANAS" → "Bananas", "ORGANIC GALA APPLES 3LB" → "Apples").
- expiryLevel: "high" = 0-2 days, "medium" = 3-5 days, "low" = 6+ days.
- If receipt has no food items, return an empty array [].

Respond ONLY with a valid JSON array. No markdown fences, no extra text:
[{"name": "Bananas", "daysUntilExpiration": 5, "expiryLevel": "medium"}]`;

  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You extract food items from grocery receipts and return valid JSON arrays only. No markdown, no extra text. If no food items found, return [].",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    }),
  });

  if (!llmRes.ok) {
    const body = await llmRes.text();
    throw new Error(`OpenRouter HTTP ${llmRes.status}: ${body.slice(0, 200)}`);
  }

  const llmData = (await llmRes.json()) as any;
  const content = llmData.choices?.[0]?.message?.content;

  if (!content) {
    console.error("Unexpected OpenRouter response:", JSON.stringify(llmData));
    throw new Error("LLM returned no content");
  }

  let raw: string = content.trim();
  // Strip markdown code fences if the model adds them despite instructions
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// POST /api/items/parseReceipt
// Accepts { ocrText: string } from the frontend after it calls Vision API.
// This is the primary scan path — Vision happens client-side (using EXPO_PUBLIC key),
// LLM parsing happens here so the OpenRouter key stays server-side.
router.post("/parseReceipt", async (req: AuthRequest, res: Response) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText || typeof ocrText !== "string" || ocrText.trim().length < 10) {
      res.status(400).json({
        stage: "validation",
        error: "No receipt text provided",
      });
      return;
    }

    console.log(`[parseReceipt] uid=${req.uid} ocrText length=${ocrText.length}`);

    let items: any[];
    try {
      items = await parseFoodItemsFromText(ocrText);
    } catch (llmErr: any) {
      console.error("[parseReceipt] LLM error:", llmErr.message);
      res.status(502).json({
        stage: "llm",
        error: `AI parsing failed: ${llmErr.message}. The AI service may be temporarily unavailable — try again in a moment.`,
      });
      return;
    }

    console.log(`[parseReceipt] parsed ${items.length} items`);
    res.json({ items });
  } catch (error: any) {
    console.error("[parseReceipt] unexpected error:", error?.message);
    res.status(500).json({
      stage: "unknown",
      error: "Unexpected server error while parsing receipt.",
    });
  }
});

// POST /api/items/scan
// Full server-side pipeline: base64 image → Google Vision → LLM.
// Only works when GOOGLE_CLOUD_VISION_API_KEY is set in backend env.
// Frontend uses /parseReceipt instead (hybrid approach with client-side Vision).
router.post("/scan", async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ stage: "validation", error: "Image is required" });
      return;
    }

    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!visionApiKey) {
      res.status(501).json({
        stage: "config",
        error:
          "GOOGLE_CLOUD_VISION_API_KEY not set on the server. Use the /parseReceipt endpoint instead (client-side OCR).",
      });
      return;
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const body = await visionRes.text();
      res.status(502).json({
        stage: "ocr",
        error: `Google Vision error (HTTP ${visionRes.status}): ${body.slice(0, 200)}`,
      });
      return;
    }

    const visionData = (await visionRes.json()) as any;
    const extractedText: string | undefined =
      visionData.responses?.[0]?.fullTextAnnotation?.text;

    if (!extractedText) {
      res.status(422).json({
        stage: "ocr",
        error:
          "Could not read text from the receipt. Try again with better lighting and ensure the full receipt is in frame.",
      });
      return;
    }

    let items: any[];
    try {
      items = await parseFoodItemsFromText(extractedText);
    } catch (llmErr: any) {
      res.status(502).json({
        stage: "llm",
        error: `AI parsing failed: ${llmErr.message}`,
      });
      return;
    }

    res.json({ items });
  } catch (error: any) {
    console.error("[scan] error:", error?.message);
    res.status(500).json({
      stage: "unknown",
      error: "Unexpected server error during scan.",
    });
  }
});

// POST /api/items/scannedData — save confirmed items after user reviews scan
router.post("/scannedData", async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.uid!;
    const body = req.body;

    if (Array.isArray(body)) {
      const items = body.map((item: any) => ({ ...item, userId: uid }));
      const newItems = await Item.insertMany(items);
      res.status(201).json(newItems);
    } else {
      const { name, daysUntilExpiration, expiryLevel } = body;
      const newItem = new Item({ name, daysUntilExpiration, expiryLevel, userId: uid });
      await newItem.save();
      res.status(201).json(newItem);
    }
  } catch (error: any) {
    console.error("[scannedData] error:", error?.message);
    res.status(500).json({ error: "Failed to save items to pantry." });
  }
});

// POST /api/items/addItem — manually add a single item
router.post("/addItem", async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.uid!;
    const { name, daysUntilExpiration, expiryLevel } = req.body;

    if (!name || daysUntilExpiration == null) {
      res.status(400).json({ error: "name and daysUntilExpiration are required" });
      return;
    }

    const newItem = new Item({ name, daysUntilExpiration, expiryLevel, userId: uid });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error: any) {
    console.error("[addItem] error:", error?.message);
    res.status(500).json({ error: "Failed to add item." });
  }
});

// GET /api/items/getAllItems
router.get("/getAllItems", async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.uid!;
    const items = await Item.aggregate([
      { $match: { userId: uid } },
      {
        $addFields: {
          expirySort: {
            $switch: {
              branches: [
                { case: { $eq: ["$expiryLevel", "high"] }, then: 1 },
                { case: { $eq: ["$expiryLevel", "medium"] }, then: 2 },
                { case: { $eq: ["$expiryLevel", "low"] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: { expirySort: 1 } },
      { $project: { expirySort: 0 } },
    ]);

    res.json(items);
  } catch (error: any) {
    console.error("[getAllItems] error:", error?.message);
    res.status(500).json({ error: "Failed to fetch pantry items." });
  }
});

// GET /api/items/recipes
router.get("/recipes", async (req: AuthRequest, res: Response) => {
  try {
    const recipes = await generateRecipes(req.uid!);
    res.json({ recipes });
  } catch (error: any) {
    if (error.message === "EMPTY_PANTRY") {
      res.json({ recipes: [], emptyPantry: true });
    } else {
      console.error("[recipes] error:", error?.message);
      res.status(500).json({ error: "Could not generate recipes. Please try again." });
    }
  }
});

// PUT /api/items/:id
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.uid!;
    const { name, daysUntilExpiration, expiryLevel } = req.body;

    const updatedItem = await Item.findOneAndUpdate(
      { _id: id, userId: uid },
      { name, daysUntilExpiration, expiryLevel },
      { new: true }
    );

    if (!updatedItem) {
      res.status(404).json({ error: "Item not found" });
    } else {
      res.json(updatedItem);
    }
  } catch (error: any) {
    console.error("[PUT /:id] error:", error?.message);
    res.status(500).json({ error: "Failed to update item." });
  }
});

// DELETE /api/items/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.uid!;
    const deletedItem = await Item.findOneAndDelete({ _id: id, userId: uid });

    if (!deletedItem) {
      res.status(404).json({ error: "Item not found" });
    } else {
      res.json({ message: "Item deleted successfully" });
    }
  } catch (error: any) {
    console.error("[DELETE /:id] error:", error?.message);
    res.status(500).json({ error: "Failed to delete item." });
  }
});

export default router;
