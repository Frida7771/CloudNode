const { SNSClient } = require("@aws-sdk/client-sns");
const sendgrid = require("@sendgrid/mail");
const { Sequelize, DataTypes } = require("sequelize");
const winston = require("winston");
const crypto = require("crypto");
const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();

// Configure winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// AWS SNS client setup
const snsClient = new SNSClient({
  region: "us-east-1", // Change to your desired AWS region
});

// Function to fetch SendGrid API key from AWS Secrets Manager
async function getSendGridKey() {
  try {
    const secretValue = await secretsManager
      .getSecretValue({ SecretId: "sendgrid-credentials-13" })
      .promise();
    const credentials = JSON.parse(secretValue.SecretString);
    return credentials.apiKey;
  } catch (error) {
    console.error("Error fetching SendGrid API key from Secrets Manager:", error);
    logger.error("Error fetching SendGrid API key:", { error: error.message });
    throw new Error("Failed to fetch SendGrid API key.");
  }
}

// Function to send email using SendGrid
const sendEmail = async (token, email) => {
  try {
    // Fetch API key dynamically
    const sendGridApiKey = await getSendGridKey();
    sendgrid.setApiKey(sendGridApiKey);
    // sendgrid.setApiKey(process.env.SENDGRID_API_KEY)
    logger.info(`send grid api key: ${sendGridApiKey}`);

    const verificationLink = `https://${process.env.DOMAIN}/user/verify?token=${token}`;
    const msg = {
      to: email,
      from: "no-reply@email.ankushm.me", // Your verified SendGrid sender email
      subject: "Verify User",
      text: `Please click the link below to verify your email: ${verificationLink}`,
    };

    await sendgrid.send(msg);
    console.log("Email sent successfully to:", email);
    logger.info(`Email sent successfully to: ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    logger.error(`Error sending email to ${email}: ${error.message}`);
  }
};

// Lambda handler function for AWS
exports.handler = async (event) => {
  try {
    // Extract base64 data from SNS message
    const userData = JSON.parse(event.Records[0].Sns.Message);
    logger.info("Received user data from SNS", { userData });
    console.log("userData:", userData);

    if (!userData || !userData.email) {
      logger.error("Invalid or missing email in SNS message.");
      return {
        statusCode: 400,
        body: "Invalid or missing email in SNS message.",
      };
    }

    logger.info("Data received from SNS:", { email: userData.email });
    console.log("Data received from SNS:", userData.email);

    // Send the email
    await sendEmail(userData.token, userData.email);

    return { statusCode: 200, body: "Email sent successfully." };
  } catch (error) {
    console.error("Error in processing:", error);
    logger.error("Error in processing SNS message", { error: error.message });
    return { statusCode: 500, body: "Error processing request." };
  }
};
