require("dotenv").config();

const express = require("express");

const locationRoutes = require("./routes/locationRoutes");

const app = express();

app.use(express.json());

app.use("/api/location", locationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});