const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let planid;
    let features;
    let value;

    if (Object.keys(body).includes("planid")) {
      planid = body.planid;
    } else {
      throw new AppError("Plan is required.", statusCode.BAD_REQUEST);
    }

    if (
      Object.keys(body).includes("features") &&
      Array.isArray(body.features) &&
      body.features.length > 0
    ) {
      features = body.features;
    } else {
      throw new AppError("Features are required.", statusCode.BAD_REQUEST);
    }

    value = Object.keys(body).includes("value") ? body.value : null;

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO planfeatures
      (
        planid,
        features,
        value,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6
      )
      RETURNING *;
    `;

    const values = [
      planid,
      features, // TEXT[] array
      value,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Plan features created successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const body = req.body;

    const page = Number(body.page) || 1;
    const limit = Number(body.limit) || 10;
    const offset = (page - 1) * limit;

    const search = body.search ? `%${body.search}%` : null;

    let whereClause = `
      WHERE
        p.status = 1
        AND pf.status = 1
    `;

    const values = [];

    // Filter by Plan ID
    if (body.planid) {
      values.push(body.planid);

      whereClause += `
        AND p.id = $${values.length}
      `;
    }

    // Search
    if (search) {
      values.push(search);

      whereClause += `
        AND (
          p.plancode ILIKE $${values.length}
          OR p.name ILIKE $${values.length}
          OR pf.features ILIKE $${values.length}
          OR pf.value ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM plans p
      LEFT JOIN planfeatures pf
        ON p.id = pf.planid
      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        p.id AS planid,
        p.plancode,
        p.name,
        p.price,
        p.billingcycle,
        p.description,

        pf.id AS featureid,
        pf.features,
        pf.value

      FROM plans p

      LEFT JOIN planfeatures pf
        ON p.id = pf.planid

      ${whereClause}

      ORDER BY p.createdat DESC

      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `;

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.OK).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        totalRecords: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Id is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM planfeatures
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Plan feature not found.", statusCode.NOT_FOUND);
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

    if (!body.id) {
      throw new AppError("Id is required.", statusCode.BAD_REQUEST);
    }

    const updateFields = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(body, "planid")) {
      values.push(body.planid);
      updateFields.push(`planid = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(body, "features")) {
      if (!Array.isArray(body.features)) {
        throw new AppError(
          "Features must be an array.",
          statusCode.BAD_REQUEST,
        );
      }

      values.push(body.features);
      updateFields.push(`features = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(body, "value")) {
      values.push(body.value);
      updateFields.push(`value = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(body.id);

    const query = `
      UPDATE planfeatures
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Plan feature not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Plan feature updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deletePlanFeature = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Id is required.", statusCode.BAD_REQUEST);
    }

    const status = -1;
    const now = Date.now();

    const query = `
      UPDATE planfeatures
      SET
        status = $1,
        updatedat = $2
      WHERE
        id = $3
        AND status = 1
      RETURNING *;
    `;

    const values = [status, now, id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Plan feature not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Plan feature deleted successfully.",
      data: rows[0],
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
  deletePlanFeature,
};
