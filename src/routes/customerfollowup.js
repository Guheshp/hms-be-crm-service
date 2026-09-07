const express = require("express");

const router = express.Router();

const controller = require("../controller/customerfollowup");
const authenticate = require("../middleware/authenticate");

router.post("/create", authenticate, controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deleteFollowup);

module.exports = router;
