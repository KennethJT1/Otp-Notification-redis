import mongoose from "mongoose";

async function dbConnect() {
let db;
try{
    mongoose.set('strictQuery', true)
    db = await mongoose.connect(process.env.MONGO_URI);
   console.log("Database Connected")
   return db;
}catch(e){
    console.log("DB disconnect", e)
    db = e
    return db;
}
   
}

export default dbConnect;