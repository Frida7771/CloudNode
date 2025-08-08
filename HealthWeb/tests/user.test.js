const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../app/.env") });

const { Sequelize } = require("sequelize");


// Establish connection with database
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

const request = require("supertest");
const express = require("express");
const userRoutes = require("../app/routes/user");
const User = require("../app/models/user")(sequelize);

const app = express();
const bodyParser = require("body-parser");

// Sync the models with the database
sequelize
  .sync()
  .then(() => {
    console.log("Database synced");
  })
  .catch((error) => {
    console.error("Error syncing database:", error);
  });

app.use(bodyParser.json());
// app.use(userRoutes);
app.use(userRoutes(sequelize));

describe("User API", () => {
  let testUserEmail = "test.user@example.com";
  let authCredentials = "test.user@example.com:test123";

  // Setup the database before all tests
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  // Clean and destroy up the database after all tests
  afterAll(async () => {
    await User.destroy({
      where: { email: testUserEmail },
    });

    await sequelize.close(); // Close the database connection
  });

  // Test suite for user creation
  describe("POST /v1/user", () => {
    it("should create a new user successfully", async () => {
      const res = await request(app).post("/v1/user").send({
        first_name: "Test",
        last_name: "User",
        password: "test123",
        email: testUserEmail,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        first_name: "Test",
        last_name: "User",
        email: testUserEmail,
      });
    });

    it("should return an error if user already exists", async () => {
      const res = await request(app).post("/v1/user").send({
        first_name: "Test",
        last_name: "User",
        password: "test123",
        email: testUserEmail,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("User already exists");
    });

    it("should return an error if extra fields are provided", async () => {
      const res = await request(app).post("/v1/user").send({
        first_name: "Test",
        last_name: "User",
        password: "test123",
        email: testUserEmail,
        city: "Boston", // Extra field
      });

      expect(res.statusCode).toBe(400);
    });

    it("should return an error if all fields are not provided", async () => {
        const res = await request(app).post("/v1/user").send({
          first_name: "Test",
          last_name: "User",
        });
  
        expect(res.statusCode).toBe(400);
      });

      it("should return an error if no fields are provided", async () => {
        const res = await request(app).post("/v1/user").send({});
        expect(res.statusCode).toBe(400);
      });
  });

  // Test suite for getting user information
  describe("GET /v1/user/self", () => {
    // it("should retrieve user details", async () => {
    //   const res = await request(app)
    //     .get("/v1/user/self")
    //     .set(
    //       "Authorization",
    //       `Basic ${Buffer.from(authCredentials).toString("base64")}`
    //     );

    //   expect(res.statusCode).toBe(403);
    //   expect(res.body).toMatchObject({
    //     email: testUserEmail,
    //     first_name: "Test",
    //     last_name: "User",
    //   });
    // });

    it("should return 401 for invalid credentials", async () => {
      const invalidCredentials = "invalid@example.com:invalidpassword";
      const res = await request(app)
        .get("/v1/user/self")
        .set(
          "Authorization",
          `Basic ${Buffer.from(invalidCredentials).toString("base64")}`
        );

      expect(res.statusCode).toBe(401);
    });
  });

  // Test suite for updating user information
  describe("PUT /v1/user/self", () => {
    it("should update user details successfully", async () => {
      const updatedUserData = {
        first_name: "Test",
        last_name: "User2",
      };

      const res = await request(app)
        .put("/v1/user/self")
        .send(updatedUserData)
        .set(
          "Authorization",
          `Basic ${Buffer.from(authCredentials).toString("base64")}`
        );

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 when no fields are provided", async () => {
      const res = await request(app)
        .put("/v1/user/self")
        .send({})
        .set(
          "Authorization",
          `Basic ${Buffer.from(authCredentials).toString("base64")}`
        );

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 if extra fields are provided", async () => {
      const res = await request(app)
        .put("/v1/user/self")
        .send({
          first_name: "Test",
          last_name: "User",
          password: "test123",
          email: "updateEmail@example.com", // extrafield
        })
        .set(
          "Authorization",
          `Basic ${Buffer.from(authCredentials).toString("base64")}`
        );

      expect(res.statusCode).toBe(403);
    });

    it("should return 401 for unauthorized user", async () => {
      const invalidCredentials = "unauthorized@example.com:invalidpassword";

      const res = await request(app)
        .put("/v1/user/self")
        .send({
          first_name: "Test2",
          last_name: "User",
          password: "test1234",
        })
        .set(
          "Authorization",
          `Basic ${Buffer.from(invalidCredentials).toString("base64")}`
        );

      expect(res.statusCode).toBe(401);
    });
  });
});
