import Item from "../models/Item";

// TODO: [FIREBASE SETUP] Set OPENROUTER_API_KEY in backend .env
// To swap models, set OPENROUTER_MODEL in .env to any free OpenRouter model slug
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FREE_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

export interface RecipeResult {
  title: string;
  ingredients: string[];
  steps: string[];
  estimatedTime: string;
}

export async function generateRecipes(userId: string): Promise<RecipeResult[]> {
  const items = await Item.aggregate([
    { $match: { userId } },
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

  if (items.length === 0) {
    const err = new Error("EMPTY_PANTRY");
    throw err;
  }

  const highPriority = items.filter((i) => i.expiryLevel === "high").map((i) => i.name);
  const priorityNote =
    highPriority.length > 0
      ? `Prioritize using these items expiring soonest: ${highPriority.join(", ")}.`
      : "";

  const ingredientList = items
    .map((i) => `${i.name} (~${i.daysUntilExpiration} days until expiry)`)
    .join(", ");

  const prompt = `You are a creative chef. Available pantry ingredients: ${ingredientList}. ${priorityNote}

Generate exactly 3 recipes using these ingredients. Respond ONLY with a valid JSON array, no markdown or extra text:
[
  {
    "title": "Recipe Name",
    "ingredients": ["2 cups flour", "1 egg"],
    "steps": ["Preheat oven to 350F.", "Mix dry ingredients."],
    "estimatedTime": "30 minutes"
  }
]`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FREE_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a chef assistant. Always respond with valid JSON arrays only. No markdown fences, no explanations.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  const data = (await response.json()) as any;

  if (!data.choices || !data.choices[0]?.message?.content) {
    console.error("OpenRouter error:", data);
    throw new Error("LLM_ERROR");
  }

  let raw: string = data.choices[0].message.content.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const recipes: RecipeResult[] = JSON.parse(raw);
  return Array.isArray(recipes) ? recipes : [recipes];
}
