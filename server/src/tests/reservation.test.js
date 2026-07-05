import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-for-reservation-suite";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.ADMIN_REGISTRATION_CODE = "admin-test-code";

let app;
let mongoServer;
let Reservation;
let Table;
let User;
let seedTables;

const futureBooking = {
  reservationDate: "2099-07-05",
  timeSlot: "18:00",
  guests: 2
};

async function registerUser({
  name = "Guest User",
  email = "guest@example.com",
  password = "Password123",
  adminCode
} = {}) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password, adminCode })
    .expect(201);

  return response.body;
}

beforeAll(async () => {
  ({ app } = await import("../app.js"));
  ({ Reservation } = await import("../models/Reservation.js"));
  ({ Table } = await import("../models/Table.js"));
  ({ User } = await import("../models/User.js"));
  ({ seedTables } = await import("../services/seedService.js"));

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([Reservation.syncIndexes(), Table.syncIndexes(), User.syncIndexes()]);
}, 300000);

beforeEach(async () => {
  await Promise.all([Reservation.deleteMany({}), Table.deleteMany({}), User.deleteMany({})]);
  await seedTables();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("restaurant reservations", () => {
  it("assigns the smallest available table that can fit the party", async () => {
    const { token } = await registerUser();

    const response = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...futureBooking, guests: 3 })
      .expect(201);

    expect(response.body.reservation.table.capacity).toBe(4);
    expect(response.body.reservation.status).toBe("active");
  });

  it("allows the same time slot when another suitable table is available", async () => {
    const userOne = await registerUser({ email: "one@example.com" });
    const userTwo = await registerUser({ email: "two@example.com" });

    const first = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userOne.token}`)
      .send(futureBooking)
      .expect(201);

    const second = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userTwo.token}`)
      .send(futureBooking)
      .expect(201);

    expect(first.body.reservation.table._id).not.toBe(second.body.reservation.table._id);
  });

  it("rejects a booking when every suitable table is already occupied", async () => {
    await Table.deleteMany({});
    await Table.create({ number: 1, capacity: 2 });

    const userOne = await registerUser({ email: "one@example.com" });
    const userTwo = await registerUser({ email: "two@example.com" });

    await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userOne.token}`)
      .send(futureBooking)
      .expect(201);

    const conflict = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userTwo.token}`)
      .send(futureBooking)
      .expect(409);

    expect(conflict.body.error.code).toBe("NO_TABLE_AVAILABLE");
  });

  it("rejects party sizes that exceed every active table capacity", async () => {
    await Table.deleteMany({});
    await Table.create({ number: 1, capacity: 2 });

    const { token } = await registerUser();

    const response = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...futureBooking, guests: 3 })
      .expect(409);

    expect(response.body.error.code).toBe("NO_TABLE_AVAILABLE");
  });

  it("separates customer and admin access", async () => {
    const user = await registerUser({ email: "customer@example.com" });
    const admin = await registerUser({
      name: "Admin User",
      email: "admin@example.com",
      adminCode: "admin-test-code"
    });

    await request(app)
      .get("/api/admin/reservations")
      .set("Authorization", `Bearer ${user.token}`)
      .expect(403);

    await request(app)
      .get("/api/admin/reservations")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
  });

  it("lets a customer cancel their own reservation", async () => {
    const { token } = await registerUser();

    const created = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send(futureBooking)
      .expect(201);

    const cancelled = await request(app)
      .patch(`/api/reservations/${created.body.reservation._id}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(cancelled.body.reservation.status).toBe("cancelled");
  });
});
