import mongoose, { Schema, Document } from "mongoose";
import { IItem } from "../types/itemTypes";

interface IItemModel extends IItem, Document {}

const ItemSchema = new Schema<IItemModel>({
  name: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  category: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IItemModel>("Item", ItemSchema);
