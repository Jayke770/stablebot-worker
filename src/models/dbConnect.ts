//@ts-nocheck
import mongoose from "mongoose";
import { envconfig } from "../lib/config";
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}
async function dbConnect() {
    try {
        const opts = {
            bufferCommands: false,
        };
        if (envconfig.isDevelopment) {
            if (cached.conn) {
                return cached.conn;
            }
            if (!cached.promise) {
                cached.promise = await mongoose.connect(envconfig.MONGODB_URI, opts);
            }
            try {
                cached.conn = await cached.promise;
            } catch (e) {
                cached.promise = null;
                throw e;
            }
        } else {
            cached.promise = await mongoose.connect(envconfig.MONGODB_URI, opts);
        }
        return cached.conn;
    } catch (e) {
        console.log(e)
    }
}
export default dbConnect;