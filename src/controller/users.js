const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");
const generateUserNumber = require("../utils/users");
const bcrypt = require("bcrypt");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let usernumber;
    let firstname;
    let lastname;
    let email;
    let phone;
    let password;
    let roleid;

    usernumber = await generateUserNumber();

    if (Object.keys(body).includes("firstname")) {
      firstname = body.firstname;
    } else {
      throw new AppError("First Name is required.", statusCode.BAD_REQUEST);
    }

    lastname = Object.keys(body).includes("lastname") ? body.lastname : null;

    if (Object.keys(body).includes("email")) {
      email = body.email;
    } else {
      throw new AppError("Email is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("phone")) {
      phone = body.phone;
    } else {
      throw new AppError("Phone is required.", statusCode.BAD_REQUEST);
    }

    if (
      Object.keys(body).includes("password") &&
      body.password &&
      body.password.trim()
    ) {
      password = await bcrypt.hash(body.password, 10);
    } else {
      password = null;
    }

    if (Object.keys(body).includes("roleid")) {
      roleid = body.roleid;
    } else {
      roleid = null;
    }

    const status = 1;
    const now = Date.now();

    const emailQuery = `
  SELECT id
  FROM users
  WHERE email = $1
  LIMIT 1;
`;

    const emailResult = await db.runQuery(emailQuery, [email]);

    if (emailResult.rows.length) {
      throw new AppError("Email already exists.", statusCode.BAD_REQUEST);
    }

    const phoneQuery = `
  SELECT id
  FROM users
  WHERE phone = $1
  LIMIT 1;
`;

    const phoneResult = await db.runQuery(phoneQuery, [phone]);

    if (phoneResult.rows.length) {
      throw new AppError(
        "Phone number already exists.",
        statusCode.BAD_REQUEST,
      );
    }

    const query = `
      INSERT INTO users
      (
        usernumber,
        firstname,
        lastname,
        email,
        phone,
        password,
        roleid,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING *;
    `;

    const values = [
      usernumber,
      firstname,
      lastname,
      email,
      phone,
      password,
      roleid,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create user.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "User created successfully.",
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

    let whereClause = "WHERE status = 1";
    const values = [];

    if (search) {
      values.push(search);
      whereClause += `
        AND (
          firstname ILIKE $${values.length}
          OR lastname ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR phone ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users
      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT *
      FROM users
      ${whereClause}
      ORDER BY createdat DESC
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
      FROM users
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("User not found.", statusCode.NOT_FOUND);
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

    if (Object.keys(body).includes("firstname")) {
      values.push(body.firstname);
      updateFields.push(`firstname = $${values.length}`);
    }

    if (Object.keys(body).includes("lastname")) {
      values.push(body.lastname);
      updateFields.push(`lastname = $${values.length}`);
    }

    if (Object.keys(body).includes("email")) {
      values.push(body.email);
      updateFields.push(`email = $${values.length}`);
    }

    if (Object.keys(body).includes("phone")) {
      values.push(body.phone);
      updateFields.push(`phone = $${values.length}`);
    }

    if (Object.keys(body).includes("password")) {
      values.push(body.password);
      updateFields.push(`password = $${values.length}`);
    }

    if (Object.keys(body).includes("roleid")) {
      values.push(body.roleid);
      updateFields.push(`roleid = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE users
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("User not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "User updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
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
      UPDATE users
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
      throw new AppError("User not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "User deleted successfully.",
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
  deleteUser,
};
