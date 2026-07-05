import { Reservation } from "../models/Reservation.js";
import { Table } from "../models/Table.js";
import { AppError } from "../utils/AppError.js";

function todayIsoDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function assertBookableDate(reservationDate) {
  if (reservationDate < todayIsoDate()) {
    throw new AppError("Reservations cannot be created in the past", 400, "PAST_RESERVATION_DATE");
  }
}

function populateReservation(query) {
  return query.populate("table", "number capacity isActive").populate("user", "name email role");
}

export async function findAvailableTable({ reservationDate, timeSlot, guests, excludeReservationId }) {
  const bookedQuery = {
    reservationDate,
    timeSlot,
    status: "active"
  };

  if (excludeReservationId) {
    bookedQuery._id = { $ne: excludeReservationId };
  }

  const bookedReservations = await Reservation.find(bookedQuery).select("table");
  const bookedTableIds = new Set(bookedReservations.map((reservation) => reservation.table.toString()));

  const candidateTables = await Table.find({
    isActive: true,
    capacity: { $gte: guests }
  }).sort({ capacity: 1, number: 1 });

  return candidateTables.find((table) => !bookedTableIds.has(table._id.toString())) || null;
}

export async function createReservation(userId, input) {
  assertBookableDate(input.reservationDate);

  const table = await findAvailableTable(input);
  if (!table) {
    throw new AppError("No table is available for that date, time, and party size", 409, "NO_TABLE_AVAILABLE");
  }

  try {
    const reservation = await Reservation.create({
      user: userId,
      table: table._id,
      reservationDate: input.reservationDate,
      timeSlot: input.timeSlot,
      guests: input.guests,
      notes: input.notes || ""
    });

    return populateReservation(Reservation.findById(reservation._id));
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("That table was just booked for this time slot", 409, "RESERVATION_CONFLICT");
    }

    throw error;
  }
}

export async function updateReservation(reservationId, input) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
  }

  if (input.status === "cancelled") {
    return cancelReservation(reservationId, input.cancelledBy);
  }

  if (reservation.status !== "active") {
    throw new AppError("Cancelled reservations cannot be updated", 400, "RESERVATION_NOT_ACTIVE");
  }

  const nextDate = input.reservationDate ?? reservation.reservationDate;
  const nextTimeSlot = input.timeSlot ?? reservation.timeSlot;
  const nextGuests = input.guests ?? reservation.guests;
  const bookingChanged =
    nextDate !== reservation.reservationDate ||
    nextTimeSlot !== reservation.timeSlot ||
    nextGuests !== reservation.guests;

  if (bookingChanged) {
    assertBookableDate(nextDate);

    const table = await findAvailableTable({
      reservationDate: nextDate,
      timeSlot: nextTimeSlot,
      guests: nextGuests,
      excludeReservationId: reservation._id
    });

    if (!table) {
      throw new AppError("No table is available for that updated booking", 409, "NO_TABLE_AVAILABLE");
    }

    reservation.table = table._id;
    reservation.reservationDate = nextDate;
    reservation.timeSlot = nextTimeSlot;
    reservation.guests = nextGuests;
  }

  if (input.notes !== undefined) {
    reservation.notes = input.notes;
  }

  try {
    await reservation.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("That table was just booked for this time slot", 409, "RESERVATION_CONFLICT");
    }

    throw error;
  }

  return populateReservation(Reservation.findById(reservation._id));
}

export async function cancelReservation(reservationId, cancelledBy) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
  }

  if (reservation.status === "cancelled") {
    return populateReservation(Reservation.findById(reservation._id));
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancelledBy = cancelledBy;
  await reservation.save();

  return populateReservation(Reservation.findById(reservation._id));
}

export function reservationResponse(reservation) {
  return { reservation };
}
