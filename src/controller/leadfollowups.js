const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let leadid;
    let followupdate;
    let mode;
    let remarks;
    let nextfollowupdate;
    let createdby;

    if (Object.keys(body).includes("leadid")) {
      leadid = body.leadid;
    } else {
      throw new AppError("Lead is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("followupdate")) {
      followupdate = body.followupdate;
    } else {
      throw new AppError("Follow Up Date is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("mode")) {
      mode = body.mode;
    } else {
      throw new AppError("Mode is required.", statusCode.BAD_REQUEST);
    }

    remarks = Object.keys(body).includes("remarks") ? body.remarks : null;

    nextfollowupdate = Object.keys(body).includes("nextfollowupdate")
      ? body.nextfollowupdate
      : null;

    if (Object.keys(body).includes("createdby")) {
      createdby = body.createdby;
    } else {
      throw new AppError("Created By is required.", statusCode.BAD_REQUEST);
    }

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO leadfollowups
      (
        leadid,
        followupdate,
        mode,
        remarks,
        nextfollowupdate,
        status,
        createdby,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      RETURNING *;
    `;

    const values = [
      leadid,
      followupdate,
      mode,
      remarks,
      nextfollowupdate,
      status,
      createdby,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create follow up.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Follow up created successfully.",
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

    let whereClause = "WHERE lf.status = 1";
    const values = [];

    if (body.leadid) {
      values.push(body.leadid);

      whereClause += `
    AND lf.leadid = $${values.length}
  `;
    }

    if (search) {
      values.push(search);

      whereClause += `
        AND (
          l.leadnumber ILIKE $${values.length}
          OR l.hospitalname ILIKE $${values.length}
          OR l.firstname ILIKE $${values.length}
          OR l.lastname ILIKE $${values.length}
          OR l.email ILIKE $${values.length}
          OR l.phone ILIKE $${values.length}
          OR lf.mode ILIKE $${values.length}
          OR ls.name ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM leadfollowups lf

      LEFT JOIN leads l
        ON l.id = lf.leadid

      LEFT JOIN leadstatus ls
        ON ls.id = l.leadstatusid

      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        lf.*,

        l.leadnumber,
        l.hospitalname,
        l.firstname,
        l.lastname,
        l.email,
        l.phone,
        l.priority,
        l.source,

        ls.id AS leadstatusid,
        ls.name AS leadstatus,

        u.id AS createdbyid,
        u.firstname || ' ' || COALESCE(u.lastname, '') AS createdbyname

      FROM leadfollowups lf

      LEFT JOIN leads l
        ON l.id = lf.leadid

      LEFT JOIN leadstatus ls
        ON ls.id = l.leadstatusid

      LEFT JOIN users u
        ON u.id = lf.createdby

      ${whereClause}

      ORDER BY lf.createdat DESC

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
      FROM leadfollowups
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Follow up not found.", statusCode.NOT_FOUND);
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

    if (Object.keys(body).includes("leadid")) {
      values.push(body.leadid);
      updateFields.push(`leadid = $${values.length}`);
    }

    if (Object.keys(body).includes("followupdate")) {
      values.push(body.followupdate);
      updateFields.push(`followupdate = $${values.length}`);
    }

    if (Object.keys(body).includes("mode")) {
      values.push(body.mode);
      updateFields.push(`mode = $${values.length}`);
    }

    if (Object.keys(body).includes("remarks")) {
      values.push(body.remarks);
      updateFields.push(`remarks = $${values.length}`);
    }

    if (Object.keys(body).includes("nextfollowupdate")) {
      values.push(body.nextfollowupdate);
      updateFields.push(`nextfollowupdate = $${values.length}`);
    }

    if (Object.keys(body).includes("createdby")) {
      values.push(body.createdby);
      updateFields.push(`createdby = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE leadfollowups
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Follow up not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Follow up updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteLeadFollowUp = async (req, res, next) => {
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
      UPDATE leadfollowups
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
      throw new AppError("Follow up not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Follow up deleted successfully.",
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
  deleteLeadFollowUp,
};
