const express = require("express");

const controller = require("../controller/leads");
const authenticate = require("../middlewares/auth");

const router = express.Router();

/* ==========================
   Lead Routes
========================== */

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deleteLead);
router.post("/updateleadstatus", authenticate, controller.updateLeadStatus);

module.exports = router;
