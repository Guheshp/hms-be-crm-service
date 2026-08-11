const db = require("../config/database.js");
const { statusCode } = require("../constants/common.js");
const { sendMail } = require("../services/mail/mailService.js");
const enquiryCreated = require("../services/mail/templates/enquiryCreated.js");
const AppError = require("../utils/appError.js");
const generateEnquiryNumber = require("../utils/enquiries.js");

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let enquirynumber;
    let hospitalname;
    let contactperson;
    let email;
    let phone;
    let remarks;

    enquirynumber = await generateEnquiryNumber();

    if (Object.keys(body).includes("hospitalname")) {
      hospitalname = body.hospitalname;
    } else {
      hospitalname = null;
    }

    if (Object.keys(body).includes("contactperson")) {
      contactperson = body.contactperson;
    } else {
      throw new AppError("Contact Person is required.", statusCode.BAD_REQUEST);
    }

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

    if (Object.keys(body).includes("remarks")) {
      remarks = body.remarks;
    } else {
      remarks = null;
    }

    const status = 1;
    const now = Date.now();

    const query = `
        INSERT INTO enquiries
        (
            enquirynumber,
            hospitalname,
            contactperson,
            email,
            phone,
            status,
            remarks,
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
      enquirynumber,
      hospitalname,
      contactperson,
      email,
      phone,
      status,
      remarks,
      now,
      now,
    ];

    //     console.log(`${query}
    //       ${values.map((value, index) => `$${index + 1} : ${value}`).join("\n")}

    // `);
    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create enquiry.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    await sendMail({
      to: process.env.ADMIN_EMAIL,

      subject: "New Enquiry Received",

      html: enquiryCreated(rows[0]),
    });

    return res.status(201).json({
      success: true,
      message: "Enquiry created successfully.",
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

    let whereClause = "WHERE e.status = 1";
    const values = [];

    if (search) {
      values.push(search);

      whereClause += `
    AND (
      e.hospitalname ILIKE $${values.length}
      OR e.email ILIKE $${values.length}
      OR e.contactperson ILIKE $${values.length}
      OR e.phone ILIKE $${values.length}
      OR e.enquirynumber ILIKE $${values.length}
    )
  `;
    }

    const countQuery = `
  SELECT COUNT(*) AS total
  FROM enquiries e
  LEFT JOIN leads l
    ON e.id = l.enquiryid
  ${whereClause};
`;

    const countResult = await db.runQuery(countQuery, values);

    values.push(limit);
    values.push(offset);

    const query = `
  SELECT
    e.*,
    CASE
      WHEN l.id IS NOT NULL THEN TRUE
      ELSE FALSE
    END AS isconverted
  FROM enquiries e
  LEFT JOIN leads l
    ON e.id = l.enquiryid
  ${whereClause}
  ORDER BY e.createdat DESC
  LIMIT $${values.length - 1}
  OFFSET $${values.length};
`;

    const { rows } = await db.runQuery(query, values);

    return res.status(200).json({
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
      FROM enquiries
      WHERE id = $1
      LIMIT 1;
    `;

    const values = [id];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Enquiry not found.", statusCode.NOT_FOUND);
    }

    return res.status(200).json({
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
      "hospitalname",
      "firstname",
      "lastname",
      "email",
      "phone",
      "address",
      "countryid",
      "stateid",
      "city",
      "pincode",
      "userid",
      "leadstatusid",
      "priority",
      "source",
      "expectedamount",
      "remarks",
    ];

    fields.forEach((field) => {
      if (Object.keys(body).includes(field)) {
        values.push(body[field]);
        updateFields.push(`${field} = $${values.length}`);
      }
    });

    if (updateFields.length === 0) {
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

const deleteEnquiry = async (req, res, next) => {
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
      UPDATE enquiries
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
      throw new AppError("Enquiry not found.", statusCode.NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully.",
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
  deleteEnquiry,
};
