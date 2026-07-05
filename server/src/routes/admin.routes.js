import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Reservation, TIME_SLOTS } from "../models/Reservation.js";
import { Table } from "../models/Table.js";
import { cancelReservation, updateReservation } from "../services/reservationService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const listReservationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    date: dateSchema.optional()
  })
});

const updateReservationSchema = z.object({
  body: z.object({
    reservationDate: dateSchema.optional(),
    timeSlot: z.enum(TIME_SLOTS).optional(),
    guests: z.coerce.number().int().min(1).max(20).optional(),
    notes: z.string().trim().max(300).optional(),
    status: z.enum(["active", "cancelled"]).optional()
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

const idParamsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

const createTableSchema = z.object({
  body: z.object({
    number: z.coerce.number().int().min(1),
    capacity: z.coerce.number().int().min(1).max(20),
    isActive: z.coerce.boolean().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateTableSchema = z.object({
  body: z.object({
    number: z.coerce.number().int().min(1).optional(),
    capacity: z.coerce.number().int().min(1).max(20).optional(),
    isActive: z.coerce.boolean().optional()
  }),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

router.use(authenticate, authorize("admin"));

router.get(
  "/reservations",
  validate(listReservationsSchema),
  asyncHandler(async (req, res) => {
    const filter = req.validated.query.date ? { reservationDate: req.validated.query.date } : {};
    const reservations = await Reservation.find(filter)
      .sort({ reservationDate: 1, timeSlot: 1, createdAt: -1 })
      .populate("table", "number capacity isActive")
      .populate("user", "name email role");

    res.json({ reservations });
  })
);

router.patch(
  "/reservations/:id",
  validate(updateReservationSchema),
  asyncHandler(async (req, res) => {
    const reservation = await updateReservation(req.validated.params.id, {
      ...req.validated.body,
      cancelledBy: req.user.id
    });

    res.json({ reservation });
  })
);

router.patch(
  "/reservations/:id/cancel",
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    const reservation = await cancelReservation(req.validated.params.id, req.user.id);
    res.json({ reservation });
  })
);

router.get(
  "/tables",
  asyncHandler(async (req, res) => {
    const tables = await Table.find().sort({ number: 1 });
    res.json({ tables });
  })
);

router.post(
  "/tables",
  validate(createTableSchema),
  asyncHandler(async (req, res) => {
    const existing = await Table.findOne({ number: req.validated.body.number });
    if (existing) {
      throw new AppError("A table with that number already exists", 409, "TABLE_EXISTS");
    }

    const table = await Table.create(req.validated.body);
    res.status(201).json({ table });
  })
);

router.patch(
  "/tables/:id",
  validate(updateTableSchema),
  asyncHandler(async (req, res) => {
    const table = await Table.findById(req.validated.params.id);
    if (!table) {
      throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    }

    if (req.validated.body.number !== undefined && req.validated.body.number !== table.number) {
      const existing = await Table.findOne({ number: req.validated.body.number });
      if (existing) {
        throw new AppError("A table with that number already exists", 409, "TABLE_EXISTS");
      }

      table.number = req.validated.body.number;
    }

    if (req.validated.body.capacity !== undefined) {
      const overCapacityReservations = await Reservation.countDocuments({
        table: table._id,
        status: "active",
        guests: { $gt: req.validated.body.capacity }
      });

      if (overCapacityReservations > 0) {
        throw new AppError(
          "Capacity cannot be lower than existing active reservations for this table",
          409,
          "TABLE_CAPACITY_CONFLICT"
        );
      }

      table.capacity = req.validated.body.capacity;
    }

    if (req.validated.body.isActive !== undefined) {
      table.isActive = req.validated.body.isActive;
    }

    await table.save();
    res.json({ table });
  })
);

router.delete(
  "/tables/:id",
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    const table = await Table.findById(req.validated.params.id);
    if (!table) {
      throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    }

    table.isActive = false;
    await table.save();
    res.json({ table });
  })
);

export default router;
