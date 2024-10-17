import mongoose from "mongoose";

export let dbInstance = undefined;

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.DB_URI);
    dbInstance = connectionInstance;
    console.log("Connected to Database");
  } catch (e) {
    console.log("Couldn't connect to database");
    console.log(e);
  }
};

export { connectDB };
