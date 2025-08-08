const express = require("express");
const UserModel = require("../models/user");
const EmailLogModel = require("../models/emailLog");
const bcrypt = require("bcryptjs");
const router = express.Router();
const AWS = require("aws-sdk");
const crypto = require("crypto");

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
});

const sns = new AWS.SNS();
module.exports = (sequelize) => {
  const User = UserModel(sequelize);
  const EmailLog = EmailLogModel(sequelize);

  async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [username, password] = Buffer.from(authHeader.split(" ")[1], "base64")
      .toString()
      .split(":");

    try {
      const user = await User.findOne({ where: { email: username } });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!user || !user.verified) {
        return res
          .status(403)
          .json({ message: "Access denied. Verify your email first." });
      }

      req.userId = user.id;
      next();
    } catch (error) {
      console.log("Authentication error:", error);
      res.status(503).send("Service Unavailable");
    }
  }

  router.head("/v1/user/self", async (req, res) => {
    return res
      .status(405)
      .set("Cache-Control", "no-cache", "no-store", "must-revalidate")
      .send();
  });

  // post request to add a user
  router.post("/v1/user", async (req, res) => {
    try {
      const { first_name, last_name, email, password } = req.body;

      const allowedFields = ["first_name", "last_name", "email", "password"];
      const invalidFields = Object.keys(req.body).filter(
        (field) => !allowedFields.includes(field)
      );

      // return 400 for invalid fields
      if (invalidFields.length > 0) {
        return res.status(400).json({ message: "Bad request" });
      }

      // validate if the fields are string
      if (!validate_input(first_name, last_name, password, email)) {
        return res.status(400).json({
          message: "Bad Request",
        });
      }

      // validate email format
      if (!emailFormat(email)) {
        return res.status(400).json({
          message: "Bad Request",
        });
      }

      // checking for existing user
      const isExistingUser = await User.findOne({ where: { email } });
      if (isExistingUser) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      // creating the user
      const user = await User.create({
        first_name,
        last_name,
        email,
        password,
      });

      const token = await createToken(user.email, EmailLog)

      // Publish to SNS topic
      const snsMessage = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_created: user.account_created,
        token: token
      };

      const params = {
        Message: JSON.stringify(snsMessage),
        TopicArn: process.env.SNS_TOPIC_ARN, 
      };

      sns.publish(params, (err, data) => {
        if (err) {
          console.log("Error publishing to SNS:", err);
        } else {
          console.log("SNS publish result:", data);
        }
      });

      // set the response
      res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_created: user.account_created,
        account_updated: user.account_updated,
      });
    } catch (err) {
      console.log(err);
      res
        .status(503)
        .set("Cache-Control", "no-cache", "no-store", "must-revalidate")
        .send();
    }
  });

  // verification route
  router.get("/user/verify", async (req, res) => {
    try {
      const token = req.query.token;
      console.log("Received token:", token);
  
      if (!token) {
        console.log("Token is missing in the request.");
        res.status(403).send("Token is missing or invalid.");
        return;
      }
  
      const userDetail = await EmailLog.findOne({
        where: { token: token },
      });
  
      if (!userDetail) {
        console.log("No user details found for the provided token.");
        res.status(403).send("Invalid or expired token.");
        return;
      }
  
      console.log("Email log found:", userDetail);
  
      const currTime = Math.floor(Date.now() / 1000);
      const email_time = Math.floor(userDetail.email_sent_time / 1000);
      const diffTime = currTime - email_time;
  
      console.log(`Current time: ${currTime}, Email sent time: ${email_time}, Time difference: ${diffTime}s`);
  
      if (diffTime >= 2 * 60) { // 2 minutes in seconds
        console.warn("Token has expired.");
        res.status(403).send("Link expired. Please request a new verification email.");
        return;
      }
  
      const email = userDetail.email;
      console.log("Email associated with token:", email);
  
      if (email) {
        const user = await User.findOne({
          where: { email: email },
        });
  
        if (user) {
          console.log("User found:", user);
  
          await user.update({ verified: true });
          console.log("User verified successfully.");
  
          await userDetail.update({ email_verified_time: Date.now() });
          console.log("Email verification time updated in EmailLog.");
  
          // Send success response to the user
          res.status(200).send(`
            <html>
              <body style="text-align: center; margin-top: 50px;">
                <h1>Email Verified Successfully!</h1>
                <p>Your email has been verified. You can now log in.</p>
              </body>
            </html>
          `);
          return;
        } else {
          console.log("No user found for the provided email.");
          res.status(401).send(`
            <html>
              <body style="text-align: center; margin-top: 50px;">
                <h1>User Not Found</h1>
                <p>Unable to find a user with this email. Please contact support.</p>
              </body>
            </html>
          `);
          return;
        }
      } else {
        console.log("Email not found in user detail.");
        res.status(401).send("Invalid email associated with token.");
        return;
      }
    } catch (error) {
      console.log("An error occurred:", error);
      res.status(500).send(`
        <html>
          <body style="text-align: center; margin-top: 50px;">
            <h1>Verification Failed</h1>
            <p>An unexpected error occurred. Please try again later.</p>
          </body>
        </html>
      `);
    }
  });
  

  // get request to retreive user information
  router.get("/v1/user/self", authenticateUser, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      // check authheader exist or not
      if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // no req body should be allowed
      if (req.body && Object.keys(req.body).length > 0) {
        return res.status(400).send();
      }

      // extract username and password from authheader
      const [username, password] = Buffer.from(
        authHeader.split(" ")[1],
        "base64"
      )
        .toString()
        .split(":");
      const user = await User.findOne({ where: { email: username } });

      // check password matches or not
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      res.json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_created: user.account_created,
        account_updated: user.account_updated,
      });
    } catch (error) {
      console.log(error);
      res
        .status(503)
        .set("Cache-Control", "no-cache", "no-store", "must-revalidate")
        .send();
    }
  });

  router.put("/v1/user/self", authenticateUser, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // extract username and password from authheader
      const [username, password] = Buffer.from(
        authHeader.split(" ")[1],
        "base64"
      )
        .toString()
        .split(":");
      const user = await User.findOne({ where: { email: username } });

      // check password matches or not
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { first_name, last_name, password: newPassword } = req.body;

      // validate if the fields are string
      if (first_name != undefined) {
        if (first_name !== "string" && first_name.trim() === "") {
          return res.status(400).json({ message: "Bad Request" });
        }
      }
      if (last_name != undefined) {
        if (last_name !== "string" && last_name.trim() === "") {
          return res.status(400).json({ message: "Bad Request" });
        }
      }
      if (newPassword != undefined) {
        if (newPassword !== "string" && newPassword.trim() === "") {
          return res.status(400).json({ message: "Bad Request" });
        }
      }

      const allowedFields = ["first_name", "last_name", "password"];
      const invalidFields = Object.keys(req.body).filter(
        (field) => !allowedFields.includes(field)
      );

      // return 400 for invalid fields
      if (invalidFields.length > 0) {
        return res.status(400).json({ message: "Bad request" });
      }

      // return 204 when all fields are empty
      if (
        first_name == undefined &&
        last_name == undefined &&
        newPassword == undefined
      ) {
        return res.status(400).json({ message: "Bad Request" });
      }

      // updating fields
      if (first_name && first_name.length > 0) {
        user.first_name = first_name;
      }
      if (last_name && last_name.length > 0) {
        user.last_name = last_name;
      }
      if (newPassword && newPassword.length > 0) {
        user.password = newPassword;
      }

      await user.save();

      res.status(204).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_created: user.account_created,
        account_updated: user.account_updated,
      });
    } catch (err) {
      console.log(err);
      res
        .status(503)
        .set("Cache-Control", "no-cache", "no-store", "must-revalidate")
        .send();
    }
  });

  // return 405 for all other methods
  router.all("/v1/user/self", async (req, res) => {
    return res
      .status(405)
      .set("Cache-Control", "no-cache", "no-store", "must-revalidate")
      .send();
  });

  return router;
};

function validate_input(first_name, last_name, password, email) {
  return (
    typeof first_name === "string" &&
    typeof last_name === "string" &&
    typeof email === "string" &&
    typeof password === "string"
  );
}

function emailFormat(email) {
  const pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return pattern.test(email);
}

// Create a new user verification record
async function createToken(email, EmailLog) {
  try {
    // Generate a random 32-byte token (256 bits)
    const token = crypto.randomBytes(32).toString("hex");

    // Store the token in the database or use it as needed
    await EmailLog.create({
      email: email,
      token: token,
      email_sent_time: new Date(),
      email_verified_time: null, // Initially set to null as it hasn't been verified yet
    });

    return token;
  } catch (error) {
    console.log("Error creating token:", error);
    return null;
  }
}
