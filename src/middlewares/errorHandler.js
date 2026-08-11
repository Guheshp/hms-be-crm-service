const { statusCode } = require("../constants/common");

const errorHandler = (error, req, res, next) => {
  console.error(error);

  return res.status(error.statusCode || statusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    statusCode: error.statusCode || statusCode.INTERNAL_SERVER_ERROR,
    message: error.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
