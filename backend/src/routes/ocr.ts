import express, { Request, Response } from "express";
import Item from "../models/Item";
import fs from "fs";
import sendRecipe from "./apigen"
import dotenv from 'dotenv';

import axios from "axios";
dotenv.config({ path: './.env' });


const extractFoodItems = (ocrText: string): string[] => {
    const lines = ocrText.split("\n").map(line => line.trim());
    const priceRegex = /\$\d+(\.\d{2})?/;
    const blacklist = new Set([
      "SPECIAL",
      "SUBTOTAL",
      "TOTAL",
      "LOYALTY",
      "CHANGE",
      "CASH",
      "BALANCE",
      "DISCOUNT",
    ]);

    let items: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || blacklist.has(line)) continue;
      if (priceRegex.test(line) && i > 0) {
        const prevLine = lines[i - 1];
        if (
          !priceRegex.test(prevLine) &&
          prevLine.length > 3 &&
          !blacklist.has(prevLine) &&
          !/\d/.test(prevLine)
        ) {
          items.push(prevLine);
        }
      }
    }
    return items;
  };

  const inferExpiry = async (foodItems: string[]) => {
    try {
      const prompt = `For each of the following food items, estimate how many days they will last before they expire. 
Additionally, standardize each food item name to a more common format:
- Convert all uppercase names to title case.
- Remove unnecessary descriptors (e.g., "Brushed Potatoes" → "Potatoes", "Green Apple" → "Apple").
- Generalize names where possible (e.g., "Iceberg Lettuce" → "Lettuce", "Cavendish Banana" → "Banana").

${foodItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Respond **only** in JSON format as an array of objects, each with:
- "name": the standardized food item name
- "daysUntilExpiration": an integer estimate of how many days until it expires
- "expiryLevel": "high" (≤2 days), "medium" (3-5 days), or "low" (≥6 days)

Example JSON Output:
\`\`\`json
[
  {"name": "Banana", "daysUntilExpiration": 5, "expiryLevel": "medium"},
  {"name": "Broccoli", "daysUntilExpiration": 3, "expiryLevel": "medium"}
]
\`\`\`
`;

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "meta-llama/llama-3.2-3b-instruct:free",
          messages: [
            { role: "system", content: "You must respond **only** in JSON format. No extra text, explanations, or formatting." },
            { role: "user", content: prompt },
          ],
          max_tokens: 750,
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const choices = response.data.choices;
      if (!choices || choices.length === 0 || !choices[0].message || !choices[0].message.content) {
        console.error("Invalid response structure:", response.data);
        return [];
      }

      let responseText = choices[0].message.content;
      responseText = responseText.replace(/```json|```/g, "").trim();

      const result = JSON.parse(responseText);
      console.log("Inferred Expiry Data:", result);
      return result;
    } catch (error) {
      console.error("Error inferring expiration:", error);
      return [];
    }
  };

  const sendDataToBackend = async (foodData: any[]) => {
    try {
      const response = await axios.post(`${process.env.SERVER_URL}/api/items/scannedData`, foodData);
      console.log("Data successfully sent to backend:", response.data);
    } catch (error) {
      console.error("Error sending data to backend:", error);
      throw error;
    }
  };

  export default async function ocrText (base64Image: string) {    // setProcessing(true);
    try {
      const requestPayload = {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      };

      const apiResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
        requestPayload
      );

      const extractedText = apiResponse.data.responses[0]?.fullTextAnnotation?.text;
    //   console.log("Raw OCR Text:", extractedText);

      if (!extractedText) {
        console.error("No text extracted.");
        // setProcessing(false);
        return;
      }

      const foodItems = extractFoodItems(extractedText);
      console.log("Filtered Food Items:", foodItems);

      const foodData = await inferExpiry(foodItems);
      console.log("Final Output:", foodData);

      if (foodData.length > 0) {
        await sendDataToBackend(foodData);
        return {error: 'false'};
      } else {
      }
    } catch (error) {
      console.error("Error with OCR:", error);
      return {error: 'true'};
    }
  };
  
  
  