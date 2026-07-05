import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

tableSchema.index({ capacity: 1, number: 1 });

export const Table = mongoose.model("Table", tableSchema);
