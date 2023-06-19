import twilio from "twilio";
import dotenv from 'dotenv';

dotenv.config()

const client = twilio(process.env.accountSid, process.env.authToken);

export const onRequestOTP = async (toPhoneNumber, otp) => {
    const response = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.fromAminPhone,
      to: toPhoneNumber,
    });
    return response;
  };