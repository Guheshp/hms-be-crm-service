const db = require("../config/database");

const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let code;
    let name;

    if (Object.keys(body).includes("code")) {
      code = body.code;
    } else {
      throw new AppError("Code is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("name")) {
      name = body.name;
    } else {
      throw new AppError("Name is required.", statusCode.BAD_REQUEST);
    }

    const now = Date.now();

    const query = `
      INSERT INTO leadstatus
      (
        code,
        name,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5
      )
      RETURNING *;
    `;

    const values = [code, name, 1, now, now];

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Lead status created successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const query = `
      SELECT *
      FROM leadstatus
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

const getById = async (req, res, next) => {
  try {
    const { id } = req.body;

    const query = `
      SELECT *
      FROM leadstatus
      WHERE
        id = $1
        AND status = 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Lead status not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const body = req.body;

    const query = `
      UPDATE leadstatus
      SET
        code = $1,
        name = $2,
        updatedat = $3
      WHERE
        id = $4
        AND status = 1
      RETURNING *;
    `;

    const values = [body.code, body.name, Date.now(), body.id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Lead status not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead status updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.body;

    const query = `
      UPDATE leadstatus
      SET
        status = 0,
        updatedat = $1
      WHERE
        id = $2
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, [Date.now(), id]);

    if (!rows.length) {
      throw new AppError("Lead status not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead status deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  get,
  getById,
  update,
  deleteLeadStatus,
};
