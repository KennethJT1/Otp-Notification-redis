import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import redis from "redis";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";

import dbConnect from "./database/conn.js";
import UserModel from "./model/User.model.js";
import {generateUniqueUsername} from "./config/index.js"


dotenv.config();
const app = express();

/** middlewares */
app.use(express.json());
app.use(morgan("tiny"));
app.disable("x-powered-by"); // less hackers know about our stack

const port = process.env.PORT || 5000;

// create a client connection
const client = redis.createClient();

// on the connection
client.on("connect", () => console.log("Connected to Redis"));

await client.connect();

app.post("/register", async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, phoneNumber } =
      req.body;

    // Generate a random OTP using the otp-generator package
    const otp = otpGenerator.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    // Check the existing user
    const existingUser = await UserModel.findOne({ username: username });
    if (existingUser) {
      return res.status(400).send({ error: "Please use a unique username" });
    }

    // Check for existing email
    const existingEmail = await UserModel.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).send({ error: "Please use a unique email" });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new UserModel({
        username: generateUniqueUsername(8),
        password: hashedPassword,
        email,
        firstName,
        lastName,
        phoneNumber,
      });

      // Store the OTP in Redis, with the user's email as the key
      client.set(email, otp);

      const { password: _, ...responseUser } = user._doc;
      // Save the user and return the response
      const result = await user.save();

      client
        .publish("otp", JSON.stringify({ phoneNumber, otp }))
        .then(() => {
          console.log("Message published successfully.");
        })
        .catch((error) => {
          console.error("Error publishing message:", error);
          return;
        });

      return res.status(201).send({
        msg: "User Registered Successfully",
        OTP: otp,
        User: responseUser,
      });
    }
  } catch (error) {
    return res.status(500).send(error);
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check the user existence
    const exist = await UserModel.findOne({ email });
    if (!exist) {
      return res.status(404).send({ error: "Can't find User!" });
    }
    if (exist.isVerified === true) {
      return res.status(404).send({ error: "Account already verified" });
    }

    // Retrieve the stored OTP from Redis, using the user's email as the key
    const storedOTP = await client.get(email);

    if (storedOTP === otp) {
      // If the OTPs match, delete the stored OTP from Redis
      await client.del(email);

      // Update the user's isVerified property in the database
      await UserModel.findOneAndUpdate({ email }, { isVerified: true });

      // Send a success response
      return res.status(200).send("OTP verified successfully");
    } else {
      // If the OTPs do not match, send an error response
      return res.status(400).send("Invalid OTP");
    }
  } catch (error) {
    return res.status(500).send({ error });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ error: "User not Found" });
    }
    if (user.isVerified === false) {
      return res
        .status(404)
        .send({ error: "Please request for an otp and verify your account" });
    }

    const passwordCheck = await bcrypt.compare(password, user.password);

    if (!passwordCheck) {
      return res.status(400).send({ error: "Password does not Match" });
    }

    // create jwt token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).send({
      msg: "Login Successful...!",
      user: user,
      token,
    });
  } catch (error) {
    return res.status(500).send({ error });
  }
});

app.post("/resendotp", async (req, res) => {
  try {
    const { email } = req.body;
    const verifiedUser = await UserModel.findOne({ email, isVerified: true });
    if (verifiedUser) {
      return res
        .status(400)
        .json({ message: "User already verified,Please Login in" });
    }

    const isNotVerified = await UserModel.findOne({ email, verified: false });
    if (!isNotVerified) {
      return res
        .status(400)
        .json({ message: "Invalid credentials, check the mail you provided" });
    }

    const otp = otpGenerator.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    await client.del(email);
    client.set(email, otp);

    client
    .publish("otp", JSON.stringify({ phoneNumber, otp }))
    .then(() => {
      console.log("Message published successfully.");
    })
    .catch((error) => {
      console.error("Error publishing message:", error);
      return;
    });

    return res.status(201).json({
      msg: `${isNotVerified.firstName} ${isNotVerified.lastName}, a new OTP has been sent, check your email for verification`,
      otp,
    });
  } catch (error) {
    console.log("Update otp error==> ", error);
    return res.status(500).json({ error: error.message });
  }
});


dbConnect()
  .then(() => {
    try {
      app.listen(port, () => {
        console.log(`Server connected to http://localhost:${port}`);
      });
    } catch (error) {
      console.log("Cannot connect to the server");
    }
  })
  .catch((error) => {
    console.log("Invalid database connection...!");
  });
