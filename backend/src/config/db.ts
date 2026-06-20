import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 10000, // fail fast on initial connect attempt
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    // Retry instead of crashing — Railway restarts would otherwise loop endlessly
    console.log("🔄 Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Log disconnects so they're visible in Railway logs
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — will attempt to reconnect automatically");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

export default connectDB;
