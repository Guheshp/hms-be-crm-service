const db = require("../config/database");
const { statusCode } = require("../constants/common");

const AppError = require("../utils/appError");

// Create Call
const create = async (req, res, next) => {
  try {
    const body = req.body;

    let leadid;
    let userid;
    let calltype;
    let callstatus;
    let duration;
    let subject;
    let notes;
    let status;
    let calledat;

    if (Object.keys(body).includes("leadid")) {
      leadid = body.leadid;
    } else {
      throw new AppError("Customer is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("userid")) {
      userid = body.userid;
    } else {
      throw new AppError("User is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("calltype")) {
      calltype = body.calltype;
    } else {
      throw new AppError("Call Type is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("callstatus")) {
      callstatus = body.callstatus;
    } else {
      throw new AppError("Call Status is required.", statusCode.BAD_REQUEST);
    }

    duration = Object.keys(body).includes("duration") ? body.duration : null;

    subject = Object.keys(body).includes("subject") ? body.subject : null;

    notes = Object.keys(body).includes("notes") ? body.notes : null;

    if (Object.keys(body).includes("calledat")) {
      calledat = body.calledat;
    } else {
      throw new AppError("Called At is required.", statusCode.BAD_REQUEST);
    }

    const createdby = req.id;
    const now = Date.now();

    const query = `
      INSERT INTO calls
      (
        leadid,
        userid,
        calltype,
        callstatus,
        duration,
        subject,
        notes,
        calledat,
        createdby,
        createdat,
        updatedat,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *;
    `;

    const values = [
      leadid,
      userid,
      calltype,
      callstatus,
      duration,
      subject,
      notes,
      calledat,
      createdby,
      now,
      now,
      1,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create call.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Call created successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Get All Calls
const get = async (req, res, next) => {
  try {
    const body = req.body;

    const page = Number(body.page) || 1;
    const limit = Number(body.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE c.status = 1";
    const values = [];

    if (body.leadid) {
      values.push(body.leadid);
      whereClause += ` AND c.leadid = $${values.length}`;
    }

    if (body.userid) {
      values.push(body.userid);
      whereClause += ` AND c.userid = $${values.length}`;
    }

    if (body.search) {
      const search = `%${body.search}%`;

      values.push(search);

      whereClause += `
        AND (
          c.calltype ILIKE $${values.length}
          OR c.callstatus ILIKE $${values.length}
          OR c.subject ILIKE $${values.length}
          OR c.notes ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM calls c
      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    const totalRecords = Number(countResult.rows[0]?.total || 0);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        c.id,
        c.leadid,
        c.userid,
        c.calltype,
        c.callstatus,
        c.duration,
        c.subject,
        c.notes,
        c.calledat,
        c.createdby,
        c.createdat,
        c.updatedat
      FROM calls c
      ${whereClause}
      ORDER BY c.calledat DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `;

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.OK).json({
      success: true,
      message: "Calls fetched successfully.",
      data: rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Call By ID
const getById = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Call Id is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT
        c.id,
        c.leadid,
        c.userid,
        c.calltype,
        c.callstatus,
        c.duration,
        c.subject,
        c.notes,
        c.calledat,
        c.createdby,
        c.createdat,
        c.updatedat
      FROM calls c
      WHERE
        c.id = $1
        AND c.status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Call not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Call fetched successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Update Call
const update = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Call Id is required.", statusCode.BAD_REQUEST);
    }

    const updateFields = [];
    const values = [];

    if (Object.keys(body).includes("leadid")) {
      values.push(body.leadid);
      updateFields.push(`leadid = $${values.length}`);
    }

    if (Object.keys(body).includes("userid")) {
      values.push(body.userid);
      updateFields.push(`userid = $${values.length}`);
    }

    if (Object.keys(body).includes("calltype")) {
      values.push(body.calltype);
      updateFields.push(`calltype = $${values.length}`);
    }

    if (Object.keys(body).includes("callstatus")) {
      values.push(body.callstatus);
      updateFields.push(`callstatus = $${values.length}`);
    }

    if (Object.keys(body).includes("duration")) {
      values.push(body.duration);
      updateFields.push(`duration = $${values.length}`);
    }

    if (Object.keys(body).includes("subject")) {
      values.push(body.subject);
      updateFields.push(`subject = $${values.length}`);
    }

    if (Object.keys(body).includes("notes")) {
      values.push(body.notes);
      updateFields.push(`notes = $${values.length}`);
    }

    if (Object.keys(body).includes("calledat")) {
      values.push(body.calledat);
      updateFields.push(`calledat = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE calls
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    console.log("Query:", query);
    console.log("Values:", values);

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Call not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Call updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Delete Call
const Delete = async (req, res, next) => {
  try {
    const { id } = req.body;

    if (!id) {
      throw new AppError("Call Id is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      UPDATE calls
      SET
        status = -1,
        updatedat = $1
      WHERE
        id = $2
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, [Date.now(), id]);

    if (!rows.length) {
      throw new AppError("Call not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Call deleted successfully.",
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
  Delete,
};
