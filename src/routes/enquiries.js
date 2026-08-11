const express = require("express");

const router = express.Router();

const enquiryController = require("../controller/enquiries.js");
const authenticate = require("../middlewares/auth.js");

router.post("/create", authenticate, enquiryController.create);

router.post("/get", authenticate, enquiryController.get);

router.post("/getById", authenticate, enquiryController.getById);

router.post("/update", authenticate, enquiryController.update);

router.delete("/delete", authenticate, enquiryController.deleteEnquiry);

module.exports = router;
