const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const countries = async (req, res, next) => {
  try {
    const query = `
      SELECT *
      FROM countries
      WHERE status = 1
      ORDER BY name;
    `;

    const { rows } = await db.runQuery(query);

    return res.status(statusCode.OK).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

const states = async (req, res, next) => {
  try {
    const body = req.body;

    let countryid;

    if (Object.keys(body).includes("countryid")) {
      countryid = body.countryid;
    } else {
      throw new AppError("Country is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM states
      WHERE
        countryid = $1
        AND status = 1
      ORDER BY name;
    `;

    const values = [countryid];

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.OK).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  countries,
  states,
};
