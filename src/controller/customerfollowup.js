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
      throw new AppError("Lead Id is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("followupdate")) {
      followupdate = body.followupdate;
    } else {
      throw new AppError("Follow up date is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("mode")) {
      mode = body.mode;
    } else {
      throw new AppError("Follow up mode is required.", statusCode.BAD_REQUEST);
    }

    remarks = Object.keys(body).includes("remarks") ? body.remarks : null;

    nextfollowupdate = Object.keys(body).includes("nextfollowupdate")
      ? body.nextfollowupdate
      : null;

    createdby = req.user.id;

    const now = Date.now();

    const query = `
      INSERT INTO leadfollowups (
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9
      )
      RETURNING *;
    `;

    const values = [
      leadid,
      followupdate,
      mode,
      remarks,
      nextfollowupdate,
      1,
      createdby,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Lead follow up created successfully.",
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

    let whereClause = "WHERE lf.status = 1";
    const values = [];

    if (body.leadid) {
      values.push(body.leadid);
      whereClause += ` AND lf.leadid = $${values.length}`;
    }

    if (body.search) {
      const search = `%${body.search}%`;

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
          OR lf.remarks ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM leadfollowups lf
      LEFT JOIN leads l
        ON l.id = lf.leadid
      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    const totalRecords = Number(countResult.rows[0]?.total || 0);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        lf.id,
        lf.leadid,
        lf.followupdate,
        lf.mode,
        lf.remarks,
        lf.nextfollowupdate,
        lf.status,
        lf.createdby,
        lf.createdat,
        lf.updatedat,

        l.leadnumber,
        l.hospitalname,
        l.firstname,
        l.lastname,
        l.email,
        l.phone,

        u.firstname || ' ' ||
          COALESCE(u.lastname, '') AS createdbyname

      FROM leadfollowups lf

      LEFT JOIN leads l
        ON l.id = lf.leadid

      LEFT JOIN users u
        ON u.id = lf.createdby

      ${whereClause}

      ORDER BY lf.followupdate DESC

      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `;

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead follow ups fetched successfully.",
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

const getById = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError(
        "Lead Follow Up Id is required.",
        statusCode.BAD_REQUEST,
      );
    }

    const query = `
      SELECT
        lf.id,
        lf.leadid,
        lf.followupdate,
        lf.mode,
        lf.remarks,
        lf.nextfollowupdate,
        lf.status,
        lf.createdby,
        lf.createdat,
        lf.updatedat,

        l.leadnumber,
        l.hospitalname,
        l.firstname,
        l.lastname,
        l.email,
        l.phone,

        u.firstname || ' ' ||
          COALESCE(u.lastname, '') AS createdbyname

      FROM leadfollowups lf

      LEFT JOIN leads l
        ON l.id = lf.leadid

      LEFT JOIN users u
        ON u.id = lf.createdby

      WHERE
        lf.id = $1
        AND lf.status = 1

      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Lead follow up not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead follow up fetched successfully.",
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
      throw new AppError(
        "Lead Follow Up Id is required.",
        statusCode.BAD_REQUEST,
      );
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
      throw new AppError("Lead follow up not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead follow up updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteFollowup = async (req, res, next) => {
  try {
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError(
        "Lead Follow Up Id is required.",
        statusCode.BAD_REQUEST,
      );
    }

    const query = `
      UPDATE leadfollowups
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
      throw new AppError("Lead follow up not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead follow up deleted successfully.",
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
  deleteFollowup,
};
