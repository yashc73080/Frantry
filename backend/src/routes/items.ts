import express, { Request, Response } from "express";
import Item from "../models/Item";
import fs from "fs";
import sendRecipe from "./apigen"
import ocrText from "./ocr"

import axios from "axios";

const router = express.Router();

// POST: Add scanned data to the database
router.post("/scannedData", async (req: Request, res: Response) => {
  try {
    if (Array.isArray(req.body)) {
      // If req.body is an array, insert multiple items
      const newItems = await Item.insertMany(req.body);
      res.status(201).json(newItems);
    } else {
      // If req.body is a single object, insert one item
      const { name, daysUntilExpiration,expiryLevel } = req.body;
      const newItem = new Item({ name, daysUntilExpiration, expiryLevel });
      await newItem.save();
      res.status(201).json(newItem);
    }
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

// POST: Add a new pantry item
router.post("/addItem", async (req: Request, res: Response) => {
  try {
    if (Array.isArray(req.body)) {
      // If req.body is an array, insert multiple items
      const newItems = await Item.insertMany(req.body);
      res.status(201).json(newItems);
    } else {
      // If req.body is a single object, insert one item
      const { name, daysUntilExpiration,expiryLevel } = req.body;
      const newItem = new Item({ name, daysUntilExpiration, expiryLevel });
      await newItem.save();
      res.status(201).json(newItem);
    }
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

router.post("/photo", async (req: Request, res: Response) => {
  try {
    const photo = await ocrText(req.body.image);
    res.json(photo);
  
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});




// GET: Fetch all pantry items
router.get("/getAllItems", async (_req: Request, res: Response) => {
  try {
    const items = await Item.aggregate([
      {
        $addFields: {
          expirySort: {
            $switch: {
              branches: [
                { case: { $eq: ["$expiryLevel", "high"] }, then: 1 },
                { case: { $eq: ["$expiryLevel", "medium"] }, then: 2 },
                { case: { $eq: ["$expiryLevel", "low"] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      },
      { $sort: { expirySort: 1 } }, // Sort by numerical expirySort
      { $project: { expirySort: 0 } } // Remove expirySort from final output
    ]);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});


router.get("/recipes", async (_req: Request, res: Response) => {
  try {
    // console.log(`Recipe:`);
    const recipe = await sendRecipe();
    
    res.json(recipe);
    // res.status(200);
  
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});



router.put("/:id", async (_req: Request, res: Response) => {
    try {
      const {id} = _req.params;
      const {name, expiryDate,category,expiryLevel} = _req.body;

      const updatedItem = await Item.findByIdAndUpdate(
        id,
        { name, expiryDate, category, expiryLevel },
        { new: true } // Return the updated document
      );
  
      if (!updatedItem){
        res.status(404).json({ error: "❌ Item not found" });
      }
      else {
        res.json(updatedItem);
      }
      
      
    } catch (error) {
      res.status(500).json({ error: "❌ Server error" });
    }
  });

  router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const deletedItem = await Item.findByIdAndDelete(id);
  
      if (!deletedItem) {
        res.status(404).json({ error: "❌ Item not found" });
      }
      else {
        res.json({ message: "✅ Item deleted successfully" });
      }
  
      
    } catch (error) {
      res.status(500).json({ error: "❌ Server error" });
    }
  });

  router.get("/deleteAllItems", async (_req: Request, res: Response) => {
    try {
      // Retrieve all items from the database
      const items = await Item.find();
  
      if (items.length === 0) {
        res.status(404).json({ error: "❌ No items found to delete" });
      }
      else {

      // Loop through each item and delete it by ID
      for (const item of items) {
        await Item.findByIdAndDelete(item._id);
      }
  
      res.status(200).json({ message: "✅ All items deleted successfully" });
      }
  
  
    } catch (error) {
      console.error("Error deleting all items:", error); // Log error for debugging
      res.status(500).json({ error: "❌ Server error" });
    }
  });



export default router;