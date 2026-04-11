import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

export default connectDB;