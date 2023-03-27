const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const port = process.env.PORT || 6004;
const connectToDatabase = require("./config/database");
const { errorHandler } = require("./middlewares/errorHandler");

connectToDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Payment Service Ready!");
});
app.use("/api/payment", require("./routes/paymentRoutes"));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Payment service ready on port ${port}`);
});
