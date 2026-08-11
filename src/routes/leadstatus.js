const express = require("express");

const authenticate = require("../middlewares/auth");
const controller = require("../controller/leadstatus");

const router = express.Router();

router.use(authenticate);

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deleteLeadStatus);

module.exports = router;
