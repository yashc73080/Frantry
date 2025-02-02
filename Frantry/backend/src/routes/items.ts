import express, { Request, Response } from "express";
import Item from "../models/Item";
import fs from "fs";

const router = express.Router();

// POST: Add a new pantry item
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, expiryDate, category } = req.body;
    const newItem = new Item({ name, expiryDate, category });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});



router.post("/image", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: "Image is required" });
    } else {
      // Validate image size (e.g., 5MB limit)
      const imageSize = Buffer.from(image, "base64").length;
      if (imageSize > 5 * 1024 * 1024) { // 5MB
        res.status(400).json({ error: "Image size exceeds 5MB" });
      } else {
        console.log("Received image:", image);

        // Save the base64 image as a file
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filePath = "uploads/image.png"; // Save as PNG file
        fs.writeFileSync(filePath, buffer);

        console.log(`Image saved to ${filePath}`);
        res.status(200).json({ message: "Image received and saved successfully", filePath });
      }
    }
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Internal server error" });
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
      const {name, expiryDate,category} = _req.body;

      const updatedItem = await Item.findByIdAndUpdate(
        id,
        { name, expiryDate, category },
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
