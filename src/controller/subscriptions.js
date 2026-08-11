const db = require("../config/database");
const { statusCode } = require("../constants/common");
const AppError = require("../utils/appError");
const generateSubscriptionNumber = require("../utils/subscriptions");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let subscriptionnumber;
    let leadid;
    let organizationid;
    let planid;
    let billingcycle;
    let startdate;
    let enddate;
    let amount;
    let discount;
    let tax;
    let totalamount;

    subscriptionnumber = await generateSubscriptionNumber();

    if (Object.keys(body).includes("leadid")) {
      leadid = body.leadid;
    } else {
      throw new AppError("Lead is required.", statusCode.BAD_REQUEST);
    }

    organizationid = Object.keys(body).includes("organizationid")
      ? body.organizationid
      : null;

    if (Object.keys(body).includes("planid")) {
      planid = body.planid;
    } else {
      throw new AppError("Plan is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("billingcycle")) {
      billingcycle = body.billingcycle;
    } else {
      throw new AppError("Billing Cycle is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("startdate")) {
      startdate = body.startdate;
    } else {
      throw new AppError("Start Date is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("enddate")) {
      enddate = body.enddate;
    } else {
      throw new AppError("End Date is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("amount")) {
      amount = body.amount;
    } else {
      throw new AppError("Amount is required.", statusCode.BAD_REQUEST);
    }

    discount = Object.keys(body).includes("discount") ? body.discount : 0;

    tax = Object.keys(body).includes("tax") ? body.tax : 0;

    if (Object.keys(body).includes("totalamount")) {
      totalamount = body.totalamount;
    } else {
      throw new AppError("Total Amount is required.", statusCode.BAD_REQUEST);
    }

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO subscriptions
      (
        subscriptionnumber,
        leadid,
        organizationid,
        planid,
        billingcycle,
        startdate,
        enddate,
        amount,
        discount,
        tax,
        totalamount,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *;
    `;

    const values = [
      subscriptionnumber,
      leadid,
      organizationid,
      planid,
      billingcycle,
      startdate,
      enddate,
      amount,
      discount,
      tax,
      totalamount,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create subscription.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Subscription created successfully.",
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

    let whereClause = "WHERE s.status = 1";
    const values = [];

    // Filter by Lead
    if (body.leadid) {
      values.push(body.leadid);

      whereClause += `
        AND s.leadid = $${values.length}
      `;
    }

    // Search
    if (search) {
      values.push(search);

      whereClause += `
        AND (
          p.plancode ILIKE $${values.length}
          OR p.name ILIKE $${values.length}
          OR l.leadnumber ILIKE $${values.length}
          OR l.hospitalname ILIKE $${values.length}
          OR l.firstname ILIKE $${values.length}
          OR l.lastname ILIKE $${values.length}
          OR l.email ILIKE $${values.length}
          OR l.phone ILIKE $${values.length}
        )
      `;
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM subscriptions s

      LEFT JOIN plans p
        ON p.id = s.planid

      LEFT JOIN leads l
        ON l.id = s.leadid

      ${whereClause};
    `;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        s.*,

        -- Plan Details
        p.id AS planid,
        p.plancode,
        p.name AS planname,
        p.price AS planprice,
        p.billingcycle,
        p.description AS plandescription,

        -- Lead Details
        l.id AS leadid,
        l.leadnumber,
        l.hospitalname,
        l.firstname,
        l.lastname,
        l.email AS leademail,
        l.phone AS leadphone,
        l.address AS leadaddress,
        l.city AS leadcity,
        l.pincode AS leadpincode

      FROM subscriptions s

      LEFT JOIN plans p
        ON p.id = s.planid

      LEFT JOIN leads l
        ON l.id = s.leadid

      ${whereClause}

      ORDER BY s.createdat DESC

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
      FROM subscriptions
      WHERE id = $1
      AND status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Subscription not found.", statusCode.NOT_FOUND);
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

    const fields = [
      "leadid",
      "organizationid",
      "planid",
      "billingcycle",
      "startdate",
      "enddate",
      "amount",
      "discount",
      "tax",
      "totalamount",
    ];

    fields.forEach((field) => {
      if (Object.keys(body).includes(field)) {
        values.push(body[field]);
        updateFields.push(`${field} = $${values.length}`);
      }
    });

    if (!updateFields.length) {
      throw new AppError("No fields found to update.", statusCode.BAD_REQUEST);
    }

    values.push(Date.now());
    updateFields.push(`updatedat = $${values.length}`);

    values.push(id);

    const query = `
      UPDATE subscriptions
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Subscription not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Subscription updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deleteSubscription = async (req, res, next) => {
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
      UPDATE subscriptions
      SET
        status = $1,
        updatedat = $2
      WHERE
        id = $3
        AND status = 1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, [status, now, id]);

    if (!rows.length) {
      throw new AppError("Subscription not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Subscription deleted successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateOrganization = async (req, res, next) => {
  try {
    const { subscriptionid, organizationid } = req.body;

    const query = `
      UPDATE subscriptions
      SET
        organizationid = $1,
        updatedat = $2
      WHERE id = $3
      RETURNING *;
    `;

    const values = [organizationid, Date.now(), subscriptionid];

    const { rows } = await db.runQuery(query, values);

    return res.status(statusCode.OK).json({
      success: true,
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
  deleteSubscription,
  updateOrganization,
};
