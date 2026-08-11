const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const jwt = require("jsonwebtoken");

const { sendMail } = require("../services/mail/mailService");
const otpTemplate = require("../services/mail/templates/otp");
const generateOtp = require("../utils/generateOtp");

const login = async (req, res, next) => {
  try {
    const body = req.body;

    let email;

    if (Object.keys(body).includes("email")) {
      email = body.email;
    } else {
      throw new AppError("Email is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM users
      WHERE
        email = $1
        AND status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [email]);

    if (!rows.length) {
      throw new AppError("Invalid email.", statusCode.NOT_FOUND);
    }

    const user = rows[0];

    const otp = generateOtp();

    const otpExpiry = Date.now() + 5 * 60 * 1000;

    const updateQuery = `
      UPDATE users
      SET
        otp = $1,
        otpexpiry = $2,
        isotpverified = false,
        updatedat = $3
      WHERE id = $4;
    `;

    await db.runQuery(updateQuery, [otp, otpExpiry, Date.now(), user.id]);

    await sendMail({
      to: user.email,
      subject: "Login OTP",
      html: otpTemplate({
        firstname: user.firstname,
        otp,
      }),
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const body = req.body;

    let email;
    let otp;

    if (Object.keys(body).includes("email")) {
      email = body.email;
    } else {
      throw new AppError("Email is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("otp")) {
      otp = body.otp;
    } else {
      throw new AppError("OTP is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM users
      WHERE
        email = $1
        AND status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [email]);

    if (!rows.length) {
      throw new AppError("Invalid email.", statusCode.NOT_FOUND);
    }

    const user = rows[0];

    if (!user.otp || user.otp !== otp) {
      throw new AppError("Invalid OTP.", statusCode.BAD_REQUEST);
    }

    if (Date.now() > Number(user.otpexpiry)) {
      throw new AppError("OTP has expired.", statusCode.BAD_REQUEST);
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        roleid: user.roleid,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      },
    );

    const now = Date.now();

    const refreshTokenExpiry = now + 7 * 24 * 60 * 60 * 1000;

    await db.runQuery(
      `
      UPDATE users
      SET
        otp = NULL,
        otpexpiry = NULL,
        isotpverified = true,
        refreshtoken = $1,
        refreshtokenexpiry = $2,
        lastloginat = $3,
        updatedat = $4
      WHERE id = $5;
      `,
      [refreshToken, refreshTokenExpiry, now, now, user.id],
    );

    delete user.password;
    delete user.otp;
    delete user.otpexpiry;
    delete user.refreshtoken;
    delete user.refreshtokenexpiry;

    return res.status(statusCode.OK).json({
      success: true,
      message: "Login successful.",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const body = req.body;

    let email;

    if (Object.keys(body).includes("email")) {
      email = body.email;
    } else {
      throw new AppError("Email is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM users
      WHERE
        email = $1
        AND status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [email]);

    if (!rows.length) {
      throw new AppError("Invalid email.", statusCode.NOT_FOUND);
    }

    const user = rows[0];

    const otp = generateOtp();

    const otpExpiry = Date.now() + 5 * 60 * 1000;

    const now = Date.now();

    const updateQuery = `
      UPDATE users
      SET
        otp = $1,
        otpexpiry = $2,
        isotpverified = false,
        updatedat = $3
      WHERE id = $4;
    `;

    await db.runQuery(updateQuery, [otp, otpExpiry, now, user.id]);

    await sendMail({
      to: user.email,
      subject: "Resend Login OTP",
      html: otpTemplate({
        firstname: user.firstname,
        otp,
      }),
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: "OTP resent successfully.",
    });
  } catch (error) {
    next(error);
  }
};
const logout = async (req, res, next) => {
  try {
    const body = req.body;

    let userid;

    if (Object.keys(body).includes("userid")) {
      userid = body.userid;
    } else {
      throw new AppError("User Id is required.", statusCode.BAD_REQUEST);
    }

    const now = Date.now();

    const query = `
      UPDATE users
      SET
        refreshtoken = NULL,
        refreshtokenexpiry = NULL,
        updatedat = $1
      WHERE
        id = $2
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, [now, userid]);

    if (!rows.length) {
      throw new AppError("Invalid email.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  logout,
};
