import mongoose from "mongoose";

export const connectToMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/MyStyleList";
    await mongoose.connect(uri);
    console.log("Connect to MongoDB");
  } catch (error) {
    console.log("Error connecting to MongoDB", error.message);
  }
};
