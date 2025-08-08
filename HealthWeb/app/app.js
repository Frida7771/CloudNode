require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;
const { Sequelize } = require("sequelize");
const userRoutes = require("./routes/user");
const imageRoutes = require("./routes/image");
const AWS = require("aws-sdk");
const metrics = require("./middleware/metrics");
const logger = require("./utils/logger");

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
});

const sns = new AWS.SNS();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: (msg) => logger.info(msg),
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

// Sync models
sequelize
  .sync()
  .then(() => {
    console.log("✅ Database synced");
  })
  .catch((error) => {
    console.error("❌ Error syncing database:", error);
  });
// ⬆️ 放在中间件之前！！
app.get("/", (req, res) => {
  console.log("🎯 Hit / route");
  res.status(200).send("✅ Hello! Your Node.js app on EC2 is working!");
});


// Middleware: request logging
app.use((req, res, next) => {
  req.startTime = Date.now();
  logger.info("Request received", {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
  });
  next();
});

app.use(express.json());
app.use(metrics.apiMetricsMiddleware);
app.use(metrics.timeDatabaseQuery);
app.use(metrics.timeS3Operation);

// Middleware: response logging
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    logger.info("Response sent", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
    });
    return originalSend.call(this, body);
  };
  next();
});



// Health check
app.head("/healthz", (req, res) => {
  return res
    .status(405)
    .set("Cache-Control", "no-cache, no-store, must-revalidate")
    .send();
});

app.get("/healthz", async (req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).send();
  }

  try {
    await sequelize.authenticate();
    res
      .status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send();
  } catch (err) {
    console.error("❌ Database connection error:", err);
    res
      .status(503)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send();
  }
});

app.get("/cicd", async (req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).send();
  }

  try {
    await sequelize.authenticate();
    res
      .status(200)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send();
  } catch (err) {
    console.error("❌ Database connection error:", err);
    res
      .status(503)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send();
  }
});

// Custom middlewares
app.use((req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    return res.status(400).send();
  }
  next();
});

// Routes
app.use(userRoutes(sequelize));
app.use(imageRoutes(sequelize));

// 404 fallback
app.all("*", (req, res) => {
  res.status(404).send();
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res
    .status(503)
    .set("Cache-Control", "no-cache, no-store, must-revalidate")
    .send();
});

// Start the app
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Webapp listening on port ${port}`);
});
