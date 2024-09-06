import mongoose from "mongoose";

export let dbInstance = undefined;

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect("mongodb+srv://manan:sih-vichaar-manthan-123@db.sbgh8.mongodb.net/?retryWrites=true&w=majority&appName=DB");
        dbInstance = connectionInstance;
        console.log("Connected to Database");
    } catch (e) {
        console.log("Couldn't connect to database");
        console.log(e);
    }
};

export { connectDB };
