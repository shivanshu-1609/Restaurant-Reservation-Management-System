import mongoose from "mongoose";

export const TIME_SLOTS = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00"
];

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true
    },
    reservationDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    timeSlot: {
      type: String,
      required: true,
      enum: TIME_SLOTS
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active"
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

reservationSchema.index(
  { table: 1, reservationDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);

reservationSchema.index({ user: 1, reservationDate: 1 });
reservationSchema.index({ reservationDate: 1, timeSlot: 1 });

export const Reservation = mongoose.model("Reservation", reservationSchema);
