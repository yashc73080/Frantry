import mongoose, { Schema, Document } from "mongoose";
import { IItem } from "../types/itemTypes";

interface IItemModel extends IItem, Document {}

const ItemSchema = new Schema<IItemModel>({
  name: { type: String, required: true },
  daysUntilExpiration: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  expiryLevel: { 
    type: String, 
    required: true, 
    enum: ["low", "medium", "high"],  // Enforces that only these values are allowed
    default: "high"
  },
});

export default mongoose.model<IItemModel>("Item", ItemSchema);