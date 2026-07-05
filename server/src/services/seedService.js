import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { Table } from "../models/Table.js";
import { User } from "../models/User.js";

const DEFAULT_TABLES = [
  { number: 1, capacity: 2 },
  { number: 2, capacity: 2 },
  { number: 3, capacity: 4 },
  { number: 4, capacity: 4 },
  { number: 5, capacity: 4 },
  { number: 6, capacity: 6 },
  { number: 7, capacity: 6 },
  { number: 8, capacity: 8 }
];

export async function seedTables() {
  const tableCount = await Table.countDocuments();
  if (tableCount > 0) return;

  await Table.insertMany(DEFAULT_TABLES);
}

export async function seedAdmin() {
  if (!env.seedAdminEmail || !env.seedAdminPassword) return;

  const existingAdmin = await User.findOne({ email: env.seedAdminEmail.toLowerCase() });
  if (existingAdmin) return;

  const passwordHash = await bcrypt.hash(env.seedAdminPassword, 12);

  await User.create({
    name: env.seedAdminName,
    email: env.seedAdminEmail,
    passwordHash,
    role: "admin"
  });
}
