import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { Table } from "../models/Table.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const tables = await Table.find({ isActive: true }).sort({ capacity: 1, number: 1 });
    res.json({ tables });
  })
);

export default router;
