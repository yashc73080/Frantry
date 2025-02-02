import express, { Request, Response } from "express";
import Item from "../models/Item";
import fs from "fs";

const router = express.Router();

// POST: Add a new pantry item
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, expiryDate, category, expiryLevel} = req.body;
    const newItem = new Item({ name, expiryDate, category,expiryLevel });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});



// GET: Fetch all pantry items
router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await Item.find();
    res.json(items);
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

export default router;
