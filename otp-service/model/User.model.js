import mongoose from "mongoose";

const Schema = mongoose.Schema;

export const UserSchema = new mongoose.Schema({
    username : {
        type: String,
        required : [true, "Please provide unique username"],
        unique: [true, "Username Exist"]
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        unique : false,
    },
    email: {
        type: String,
        required : [true, "Please provide a unique email"],
        unique: [true, "Email Exist"]
    },
    firstName: {
        type: String,
        unique: false,
    },
    lastName: {
        type: String,
        unique: false,
    },
    phoneNumber: {
        type: String,
        unique: false,
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

export default mongoose.model.Users || mongoose.model('User', UserSchema);