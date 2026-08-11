const express = require("express");

const controller = require("../controller/auth");

const router = express.Router();

router.post("/login", controller.login);
router.post("/verify-otp", controller.verifyOtp);
router.post("/resend-otp", controller.resendOtp);
router.post("/logout", controller.logout);

module.exports = router;
