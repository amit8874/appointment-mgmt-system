import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cms", {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop legacy conflicting index on dentalproceduremasters if it exists
    try {
      const collection = conn.connection.collection('dentalproceduremasters');
      const indexes = await collection.indexes();
      const legacyIndex = indexes.find(i => i.name === 'name_1_organizationId_1');
      if (legacyIndex) {
        await collection.dropIndex('name_1_organizationId_1');
        console.log('[MongoDB] Successfully dropped legacy conflicting index name_1_organizationId_1 on dentalproceduremasters');
      }
    } catch (indexErr) {
      // Ignore if collection does not exist yet or index is already removed
    }
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
