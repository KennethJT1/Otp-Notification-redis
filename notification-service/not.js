import express from "express";
import dotenv from "dotenv";
import redis from "redis";
import { onRequestOTP } from "./utils/index.js";

dotenv.config();
const app = express();

/** middlewares */
app.use(express.json());
app.disable("x-powered-by");

const port = process.env.PORT || 4000;

// create a client connection
const client = redis.createClient();

client.on("connect", () => console.log("Notification Redis client Connected to Redis"));

await client.connect();

client.subscribe('otp', (message) => {
const { phoneNumber, otp } = JSON.parse(message);
 console.log(message); 
  sendOTPNotification(phoneNumber, otp);

});

const sendOTPNotification = async (phoneNumber, otp) => {
  await onRequestOTP(phoneNumber, otp);

  console.log(`Sending OTP Notification to ${phoneNumber}: OTP is ${otp}`);
};

app.listen(port, () => {
  console.log(`Notification Service connected to http://localhost:${port}`);
});

