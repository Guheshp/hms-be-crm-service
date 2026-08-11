const express = require("express");

const controller = require("../controller/master");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.post("/countries", authenticate, controller.countries);

router.post("/states", authenticate, controller.states);

module.exports = router;
