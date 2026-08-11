const express = require("express");

const controller = require("../controller/leaddemos.js");

const router = express.Router();

const authenticate = require("../middlewares/auth.js");

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deleteLeadDemo);

module.exports = router;
