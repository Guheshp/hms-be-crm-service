const express = require("express");

const router = express.Router();

const controller = require("../controller/calls");
const authenticate = require("../middlewares/auth");

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.Delete);

module.exports = router;
