import mongoose, { Schema, Document } from "mongoose";
import { IItem } from "../types/itemTypes";

interface IItemModel extends IItem, Document {}

const ItemSchema = new Schema<IItemModel>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  daysUntilExpiration: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  expiryLevel: {
    type: String,
    required: true,
    enum: ["low", "medium", "high"],
    default: "high",
  },
});

export default mongoose.model<IItemModel>("Item", ItemSchema);
