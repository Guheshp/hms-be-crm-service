const express = require("express");

const controller = require("../controller/payments");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.post("/createorder", authenticate, controller.createOrder);

router.post("/verifypayment", authenticate, controller.verifyPayment);

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deletePayment);

module.exports = router;
