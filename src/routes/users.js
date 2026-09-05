const express = require("express");

const controller = require("../controller/users");
const authenticate = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const router = express.Router();

router.post("/create", controller.create);

router.post("/get", authenticate, controller.get);

router.post("/getById", authenticate, controller.getById);

router.post("/update", authenticate, controller.update);

router.post("/delete", authenticate, controller.deleteUser);

router.post(
  "/update-profile-image",
  authenticate,
  upload.single("profileimage"),
  controller.updateProfileImage,
);

module.exports = router;
