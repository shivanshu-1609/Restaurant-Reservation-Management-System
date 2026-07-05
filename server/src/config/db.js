import mongoose from "mongoose";

export async function connectDatabase(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
