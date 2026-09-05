const express = require("express");

const controller = require("../controller/dashboard");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.post("/get", authenticate, controller.getDashboard);

module.exports = router;
