const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let plancode;
    let name;
    let price;
    let billingcycle;
    let description;

    if (Object.keys(body).includes("plancode")) {
      plancode = body.plancode;
    } else {
      throw new AppError("Plan Code is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("name")) {
      name = body.name;
    } else {
      throw new AppError("Plan Name is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("price")) {
      price = body.price;
    } else {
      throw new AppError("Price is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("billingcycle")) {
      billingcycle = body.billingcycle;
    } else {
      throw new AppError("Billing Cycle is required.", statusCode.BAD_REQUEST);
    }

    description = Object.keys(body).includes("description")
      ? body.description
      : null;

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO plans
      (
        plancode,
        name,
        price,
        billingcycle,
        description,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *;
    `;

    const values = [
      plancode,
      name,
      price,
      billingcycle,
      description,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create plan.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Plan created successfully.",
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

    let whereClause = "WHERE p.status = 1";
    const values = [];

    if (search) {
      values.push(search);

      whereClause += `
        AND (
          p.plancode ILIKE $${values.length}
          OR p.name ILIKE $${values.length}
          OR p.description ILIKE $${values.length}
          OR CAST(p.billingcycle AS TEXT) ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM plans p
      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        p.*,

        pf.id AS featureid,
        pf.features,
        pf.value

      FROM plans p

      LEFT JOIN planfeatures pf
        ON pf.planid = p.id
        AND pf.status = 1

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
      FROM plans
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Plan not found.", statusCode.NOT_FOUND);
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

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Id is required.", statusCode.BAD_REQUEST);
    }

    const updateFields = [];
    const values = [];

    if (Object.keys(body).includes("plancode")) {
      values.push(body.plancode);
      updateFields.push(`plancode = $${values.length}`);
    }

    if (Object.keys(body).includes("name")) {
      values.push(body.name);
      updateFields.push(`name = $${values.length}`);
    }

    if (Object.keys(body).includes("price")) {
      values.push(body.price);
      updateFields.push(`price = $${values.length}`);
    }

    if (Object.keys(body).includes("billingcycle")) {
      values.push(body.billingcycle);
      updateFields.push(`billingcycle = $${values.length}`);
    }

    if (Object.keys(body).includes("description")) {
      values.push(body.description);
      updateFields.push(`description = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE plans
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Plan not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Plan updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deletePlan = async (req, res, next) => {
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
      UPDATE plans
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
      throw new AppError("Plan not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Plan deleted successfully.",
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
  deletePlan,
};
