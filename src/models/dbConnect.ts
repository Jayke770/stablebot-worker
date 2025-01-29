//@ts-nocheck
import mongoose from "mongoose";
import { envconfig } from "../lib/config";
async function dbConnect() {
    try {
        return await mongoose.connect(envconfig.MONGODB_URI, { bufferCommands: false, });
    } catch (e) {
        console.log(e)
    }
}
export default dbConnect;