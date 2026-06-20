import express, { Response } from "express";
import Item from "../models/Item";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { generateRecipes } from "./apigen";

const router = express.Router();

// All routes require a valid Firebase ID token
router.use(requireAuth);

// POST /api/items/scan
// Accepts { image: base64String }, calls Google Vision + LLM, returns parsed items for confirmation
router.post("/scan", async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: "Image is required" });
      return;
    }

    // TODO: [FIREBASE SETUP] Add GOOGLE_CLOUD_VISION_API_KEY to backend .env
    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!visionApiKey) {
      res.status(500).json({ error: "Server not configured for OCR. Contact admin." });
      return;
    }

    // Call Google Cloud Vision API
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

    const visionData = (await visionRes.json()) as any;
    const extractedText: string | undefined =
      visionData.responses?.[0]?.fullTextAnnotation?.text;

    if (!extractedText) {
      res
        .status(422)
        .json({ error: "Could not read receipt — please try again in better lighting" });
      return;
    }

    // Call LLM to parse food items from OCR text
    const model =
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
    const prompt = `Extract all food product names from this grocery receipt text. For each food item, estimate how many days it keeps before expiry.

Receipt:
${extractedText}

Rules:
- Only include actual food/drink products. Skip taxes, totals, store name, membership fees, discounts.
- Standardize names: title case, remove brand names (e.g. "DOLE BANANAS" → "Bananas").
- expiryLevel: "high" = 0-2 days, "medium" = 3-5 days, "low" = 6+ days.

Respond ONLY with a valid JSON array, no markdown, no extra text:
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
              "Extract food items from receipts and return valid JSON arrays only. No markdown.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 750,
        temperature: 0.3,
      }),
    });

    const llmData = (await llmRes.json()) as any;
    const content = llmData.choices?.[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: "Failed to parse receipt — please try again" });
      return;
    }

    let raw: string = content.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const items = JSON.parse(raw);
    res.json({ items: Array.isArray(items) ? items : [items] });
  } catch (error: any) {
    console.error("Scan error:", error?.message || error);
    res
      .status(500)
      .json({ error: "Could not read receipt — please try again in better lighting" });
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
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

// POST /api/items/addItem
router.post("/addItem", async (req: AuthRequest, res: Response) => {
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
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

// GET /api/items/getAllItems — returns current user's items sorted by expiry urgency
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
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

// GET /api/items/recipes — generate recipes from user's pantry via LLM
router.get("/recipes", async (req: AuthRequest, res: Response) => {
  try {
    const recipes = await generateRecipes(req.uid!);
    res.json({ recipes });
  } catch (error: any) {
    if (error.message === "EMPTY_PANTRY") {
      res.json({ recipes: [], emptyPantry: true });
    } else {
      console.error("Recipe generation error:", error);
      res.status(500).json({ error: "Could not generate recipes. Please try again." });
    }
  }
});

// PUT /api/items/:id — update a pantry item
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
      res.status(404).json({ error: "❌ Item not found" });
    } else {
      res.json(updatedItem);
    }
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

// DELETE /api/items/:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const uid = req.uid!;
    const deletedItem = await Item.findOneAndDelete({ _id: id, userId: uid });

    if (!deletedItem) {
      res.status(404).json({ error: "❌ Item not found" });
    } else {
      res.json({ message: "✅ Item deleted successfully" });
    }
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

export default router;
