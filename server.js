require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const { connectDB } = require("./src/config/database.js");
const errorHandler = require("./src/middlewares/errorHandler.js");

const enquiryRoutes = require("./src/routes/enquiries.js");
const leadRoutes = require("./src/routes/leads.js");
const usersRoutes = require("./src/routes/users.js");
const authRoutes = require("./src/routes/auth.js");
const leaddemosRoutes = require("./src/routes/leaddemos.js");
const leadfollowupsRoutes = require("./src/routes/leadfollowups.js");
const plansRoutes = require("./src/routes/plans.js");
const planfeaturesRoutes = require("./src/routes/planfeatures.js");
const subscriptionsRoutes = require("./src/routes/subscriptions.js");
const paymentsRoutes = require("./src/routes/payments.js");
const masterRoutes = require("./src/routes/master.js");
const leadstatusRoutes = require("./src/routes/leadstatus.js");
const dashboardRoutes = require("./src/routes/dashboard");

const app = express();
const PORT = process.env.PORT || 3002;

/* ==========================
   Global Middlewares
========================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

/* ==========================
   Routes
========================== */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    service: "crm-service",
    timestamp: new Date(),
  });
});

app.use("/api/enquiries", enquiryRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leaddemos", leaddemosRoutes);
app.use("/api/leadfollowups", leadfollowupsRoutes);
app.use("/api/plans", plansRoutes);
app.use("/api/planfeatures", planfeaturesRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/leadstatus", leadstatusRoutes);
app.use("/api/dashboard", dashboardRoutes);

/* ==========================
  Global Error Handler
========================== */

app.use(errorHandler);

/* ==========================
   Start Server
========================== */

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 CRM Service is running on http://localhost:${PORT}`);
  });
}

startServer();
