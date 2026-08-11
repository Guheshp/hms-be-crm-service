const jwt = require("jsonwebtoken");

const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const authenticate = (req, res, next) => {
  console.log("Auth middleware called");
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new AppError("Access token is required.", statusCode.UNAUTHORIZED);
    }

    const token = authorization.split(" ")[1];
    if (!token) {
      throw new AppError("Invalid access token.", statusCode.UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return next(
        new AppError("Invalid or expired token.", statusCode.UNAUTHORIZED),
      );
    }

    next(error);
  }
};

module.exports = authenticate;
