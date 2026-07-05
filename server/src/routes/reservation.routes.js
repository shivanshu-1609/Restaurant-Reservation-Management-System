import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Reservation, TIME_SLOTS } from "../models/Reservation.js";
import { cancelReservation, createReservation } from "../services/reservationService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const reservationCreateSchema = z.object({
  body: z.object({
    reservationDate: dateSchema,
    timeSlot: z.enum(TIME_SLOTS),
    guests: z.coerce.number().int().min(1).max(20),
    notes: z.string().trim().max(300).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const idParamsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}).optional()
});

router.use(authenticate);

router.get(
  "/my",
  asyncHandler(async (req, res) => {
    const reservations = await Reservation.find({ user: req.user.id })
      .sort({ reservationDate: 1, timeSlot: 1 })
      .populate("table", "number capacity isActive")
      .populate("user", "name email role");

    res.json({ reservations });
  })
);

router.post(
  "/",
  validate(reservationCreateSchema),
  asyncHandler(async (req, res) => {
    const reservation = await createReservation(req.user.id, req.validated.body);
    res.status(201).json({ reservation });
  })
);

router.patch(
  "/:id/cancel",
  validate(idParamsSchema),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.validated.params.id);

    if (!reservation) {
      throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
    }

    if (reservation.user.toString() !== req.user.id && req.user.role !== "admin") {
      throw new AppError("You can only cancel your own reservations", 403, "FORBIDDEN");
    }

    const cancelled = await cancelReservation(reservation._id, req.user.id);
    res.json({ reservation: cancelled });
  })
);

export default router;
