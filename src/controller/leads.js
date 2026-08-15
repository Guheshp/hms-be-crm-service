const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");
const generateLeadNumber = require("../utils/leads");

const create = async (req, res, next) => {
  try {
    const body = req.body;
    console.log("req", req.user);
    let leadnumber;
    let enquiryid;
    let hospitalname;
    let firstname;
    let lastname;
    let email;
    let phone;
    let address;
    let countryid;
    let stateid;
    let city;
    let pincode;
    let userid;
    let assignedby;
    let leadstatusid;
    let priority;
    let source;
    let expectedamount;
    let remarks;

    leadnumber = await generateLeadNumber();

    if (Object.keys(body).includes("enquiryid") && body.enquiryid) {
      enquiryid = body.enquiryid;
    } else {
      enquiryid = null;
    }

    if (Object.keys(body).includes("hospitalname")) {
      hospitalname = body.hospitalname;
    } else {
      throw new AppError("Hospital Name is required.", statusCode.BAD_REQUEST);
    }

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

    address = Object.keys(body).includes("address") ? body.address : null;

    countryid = Object.keys(body).includes("countryid") ? body.countryid : null;

    stateid = Object.keys(body).includes("stateid") ? body.stateid : null;

    city = Object.keys(body).includes("city") ? body.city : null;

    pincode = Object.keys(body).includes("pincode") ? body.pincode : null;

    if (Object.keys(body).includes("userid")) {
      userid = body.userid;
    } else {
      throw new AppError("Assigned To is required.", statusCode.BAD_REQUEST);
    }

    assignedby = req.id;

    if (Object.keys(body).includes("leadstatusid")) {
      leadstatusid = body.leadstatusid;
    } else {
      throw new AppError("Lead Status is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("priority")) {
      priority = body.priority;
    } else {
      throw new AppError("Priority is required.", statusCode.BAD_REQUEST);
    }

    source = Object.keys(body).includes("source") ? body.source : null;

    expectedamount = Object.keys(body).includes("expectedamount")
      ? body.expectedamount
      : null;

    remarks = Object.keys(body).includes("remarks") ? body.remarks : null;

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO leads
      (
        leadnumber,
        enquiryid,
        hospitalname,
        firstname,
        lastname,
        email,
        phone,
        address,
        countryid,
        stateid,
        city,
        pincode,
        userid,
        assignedby,
        leadstatusid,
        priority,
        source,
        expectedamount,
        remarks,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
      RETURNING *;
    `;

    const values = [
      leadnumber,
      enquiryid,
      hospitalname,
      firstname,
      lastname,
      email,
      phone,
      address,
      countryid,
      stateid,
      city,
      pincode,
      userid,
      assignedby,
      leadstatusid,
      priority,
      source,
      expectedamount,
      remarks,
      status,
      now,
      now,
    ];
    console.log(query, values);

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create lead.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Lead created successfully.",
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

    let whereClause = "WHERE l.status = 1";
    const values = [];

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
    OR l.city ILIKE $${values.length}
  )
`;
    }

    const countQuery = `
  SELECT COUNT(*) AS total
  FROM leads l
  LEFT JOIN countries c
    ON c.id = l.countryid
  LEFT JOIN states s
    ON s.id = l.stateid
  LEFT JOIN leadstatus ls
    ON ls.id = l.leadstatusid
  LEFT JOIN users u
    ON u.id = l.userid
  LEFT JOIN users au
    ON au.id = l.assignedby
  ${whereClause};
`;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
  SELECT
    l.*,

    c.name AS countryname,

    s.name AS statename,

    ls.name AS leadstatus,

    u.firstname || ' ' || COALESCE(u.lastname, '') AS assignedto,

    au.firstname || ' ' || COALESCE(au.lastname, '') AS assignedbyname

  FROM leads l

  LEFT JOIN countries c
    ON c.id = l.countryid

  LEFT JOIN states s
    ON s.id = l.stateid

  LEFT JOIN leadstatus ls
    ON ls.id = l.leadstatusid

  LEFT JOIN users u
    ON u.id = l.userid

  LEFT JOIN users au
    ON au.id = l.assignedby

  ${whereClause}

  ORDER BY l.createdat DESC

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
      SELECT
        l.*,

        c.name AS countryname,

        s.name AS statename,

        ls.name AS leadstatus,

        u.firstname || ' ' || COALESCE(u.lastname, '') AS assignedto,

        au.firstname || ' ' || COALESCE(au.lastname, '') AS assignedbyname

      FROM leads l

      LEFT JOIN countries c
        ON c.id = l.countryid

      LEFT JOIN states s
        ON s.id = l.stateid

      LEFT JOIN leadstatus ls
        ON ls.id = l.leadstatusid

      LEFT JOIN users u
        ON u.id = l.userid

      LEFT JOIN users au
        ON au.id = l.assignedby

      WHERE
        l.id = $1
        AND l.status = 1

      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
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

    if (Object.keys(body).includes("enquiryid")) {
      values.push(body.enquiryid);
      updateFields.push(`enquiryid = $${values.length}`);
    }

    if (Object.keys(body).includes("hospitalname")) {
      values.push(body.hospitalname);
      updateFields.push(`hospitalname = $${values.length}`);
    }

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

    if (Object.keys(body).includes("address")) {
      values.push(body.address);
      updateFields.push(`address = $${values.length}`);
    }

    if (Object.keys(body).includes("countryid")) {
      values.push(body.countryid);
      updateFields.push(`countryid = $${values.length}`);
    }

    if (Object.keys(body).includes("stateid")) {
      values.push(body.stateid);
      updateFields.push(`stateid = $${values.length}`);
    }

    if (Object.keys(body).includes("city")) {
      values.push(body.city);
      updateFields.push(`city = $${values.length}`);
    }

    if (Object.keys(body).includes("pincode")) {
      values.push(body.pincode);
      updateFields.push(`pincode = $${values.length}`);
    }

    if (Object.keys(body).includes("userid")) {
      values.push(body.userid);
      updateFields.push(`userid = $${values.length}`);
    }

    if (Object.keys(body).includes("leadstatusid")) {
      values.push(body.leadstatusid);
      updateFields.push(`leadstatusid = $${values.length}`);
    }

    if (Object.keys(body).includes("priority")) {
      values.push(body.priority);
      updateFields.push(`priority = $${values.length}`);
    }

    if (Object.keys(body).includes("source")) {
      values.push(body.source);
      updateFields.push(`source = $${values.length}`);
    }

    if (Object.keys(body).includes("expectedamount")) {
      values.push(body.expectedamount);
      updateFields.push(`expectedamount = $${values.length}`);
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
      UPDATE leads
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
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
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
      UPDATE leads
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
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead deleted successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateLeadStatus = async (req, res, next) => {
  try {
    const body = req.body;

    let id;
    let leadstatusid;

    if (Object.keys(body).includes("id")) {
      id = body.id;
    } else {
      throw new AppError("Lead Id is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("leadstatusid")) {
      leadstatusid = body.leadstatusid;
    } else {
      throw new AppError("Lead Status is required.", statusCode.BAD_REQUEST);
    }

    const query = `
      UPDATE leads
      SET
        leadstatusid = $1,
        updatedat = $2
      WHERE
        id = $3
        AND status = 1
      RETURNING *;
    `;

    const values = [leadstatusid, Date.now(), id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
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

const updateLeadWonStatus = async (req, res, next) => {
  try {
    const body = req.body;

    if (!body.id) {
      throw new AppError("Lead Id is required.", statusCode.BAD_REQUEST);
    }

    const leadid = body.id;

    // Get Won status
    const statusQuery = `
      SELECT id
      FROM leadstatus
      WHERE
        LOWER(name) = LOWER('Won')
        AND status = 1
      LIMIT 1;
    `;

    const statusResult = await db.runQuery(statusQuery);

    if (!statusResult.rows.length) {
      throw new AppError("Won lead status not found.", statusCode.NOT_FOUND);
    }

    const leadstatusid = statusResult.rows[0].id;

    // Update lead status
    const query = `
      UPDATE leads
      SET
        leadstatusid = $1,
        updatedat = $2
      WHERE
        id = $3
        AND status = 1
      RETURNING *;
    `;

    const values = [leadstatusid, Date.now(), leadid];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Lead status updated to Won successfully.",
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
  deleteLead,
  updateLeadStatus,
  updateLeadWonStatus,
};
