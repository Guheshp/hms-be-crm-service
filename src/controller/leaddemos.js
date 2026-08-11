const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let leadid;
    let demodate;
    let demotype;
    let meetinglink;
    let presentedby;
    let remarks;

    if (Object.keys(body).includes("leadid")) {
      leadid = body.leadid;
    } else {
      throw new AppError("Lead is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("demodate")) {
      demodate = body.demodate;
    } else {
      throw new AppError("Demo Date is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("demotype")) {
      demotype = body.demotype;
    } else {
      throw new AppError("Demo Type is required.", statusCode.BAD_REQUEST);
    }

    meetinglink = Object.keys(body).includes("meetinglink")
      ? body.meetinglink
      : null;

    if (Object.keys(body).includes("presentedby")) {
      presentedby = body.presentedby;
    } else {
      throw new AppError("Presented By is required.", statusCode.BAD_REQUEST);
    }

    remarks = Object.keys(body).includes("remarks") ? body.remarks : null;

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO leaddemos
      (
        leadid,
        demodate,
        demotype,
        meetinglink,
        presentedby,
        remarks,
        status,
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
      demodate,
      demotype,
      meetinglink,
      presentedby,
      remarks,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create lead demo.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Lead demo created successfully.",
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
      FROM leaddemos
      WHERE status = 1
      ORDER BY createdat DESC;
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
    const body = req.body;

    let id;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Id is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      SELECT *
      FROM leaddemos
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Lead demo not found.", statusCode.NOT_FOUND);
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

    if (Object.keys(body).includes("demodate")) {
      values.push(body.demodate);
      updateFields.push(`demodate = $${values.length}`);
    }

    if (Object.keys(body).includes("demotype")) {
      values.push(body.demotype);
      updateFields.push(`demotype = $${values.length}`);
    }

    if (Object.keys(body).includes("meetinglink")) {
      values.push(body.meetinglink);
      updateFields.push(`meetinglink = $${values.length}`);
    }

    if (Object.keys(body).includes("presentedby")) {
      values.push(body.presentedby);
      updateFields.push(`presentedby = $${values.length}`);
    }

    if (Object.keys(body).includes("remarks")) {
      values.push(body.remarks);
      updateFields.push(`remarks = $${values.length}`);
    }

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE leaddemos
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Lead demo not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead demo updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteLeadDemo = async (req, res, next) => {
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
      UPDATE leaddemos
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
      throw new AppError("Lead demo not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead demo deleted successfully.",
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
  deleteLeadDemo,
};
