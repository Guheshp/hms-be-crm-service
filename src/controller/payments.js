const db = require("../config/database");
const { statusCode } = require("../constants/common");
const { sendOnboardingMail } = require("../services/common/common");
const AppError = require("../utils/appError");
const generatePaymentNumber = require("../utils/payments");
const crypto = require("crypto");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || amount === null || amount === "") {
      throw new AppError("Amount is required.", statusCode.BAD_REQUEST);
    }

    const totalAmount = Number(amount);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new AppError("Valid amount is required.", statusCode.BAD_REQUEST);
    }

    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `SUB_${Date.now()}`,

      // Enable UPI
      method: {
        upi: true,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(statusCode.OK).json({
      success: true,
      message: "Razorpay order created successfully.",
      data: {
        orderid: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription,
    } = req.body;

    // --------------------------------
    // 1. BASIC VALIDATION
    // --------------------------------

    if (!razorpay_order_id) {
      throw new AppError(
        "Razorpay order id is required.",
        statusCode.BAD_REQUEST,
      );
    }

    if (!razorpay_payment_id) {
      throw new AppError(
        "Razorpay payment id is required.",
        statusCode.BAD_REQUEST,
      );
    }

    if (!razorpay_signature) {
      throw new AppError(
        "Razorpay signature is required.",
        statusCode.BAD_REQUEST,
      );
    }

    if (!subscription) {
      throw new AppError(
        "Subscription details are required.",
        statusCode.BAD_REQUEST,
      );
    }

    const {
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
    } = subscription;

    if (!leadid) {
      throw new AppError("Lead is required.", statusCode.BAD_REQUEST);
    }

    if (!planid) {
      throw new AppError("Plan is required.", statusCode.BAD_REQUEST);
    }

    if (!billingcycle) {
      throw new AppError("Billing cycle is required.", statusCode.BAD_REQUEST);
    }

    if (!startdate) {
      throw new AppError("Start date is required.", statusCode.BAD_REQUEST);
    }

    if (!enddate) {
      throw new AppError("End date is required.", statusCode.BAD_REQUEST);
    }

    // --------------------------------
    // 2. VALIDATE AMOUNTS
    // --------------------------------

    const subscriptionAmount = Number(amount);
    const subscriptionDiscount = Number(discount) || 0;
    const subscriptionTax = Number(tax) || 0;
    const subscriptionTotalAmount = Number(totalamount);

    if (!Number.isFinite(subscriptionAmount) || subscriptionAmount <= 0) {
      throw new AppError(
        "Invalid subscription amount.",
        statusCode.BAD_REQUEST,
      );
    }

    if (
      !Number.isFinite(subscriptionTotalAmount) ||
      subscriptionTotalAmount <= 0
    ) {
      throw new AppError("Invalid total amount.", statusCode.BAD_REQUEST);
    }

    // --------------------------------
    // 3. VERIFY RAZORPAY SIGNATURE
    // --------------------------------

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const generatedBuffer = Buffer.from(generatedSignature, "utf8");

    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    const isValidSignature =
      generatedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(generatedBuffer, receivedBuffer);

    if (!isValidSignature) {
      throw new AppError(
        "Invalid Razorpay payment signature.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 4. FETCH RAZORPAY PAYMENT
    // --------------------------------

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!razorpayPayment) {
      throw new AppError("Razorpay payment not found.", statusCode.BAD_REQUEST);
    }

    // --------------------------------
    // 5. VERIFY PAYMENT STATUS
    // --------------------------------

    if (razorpayPayment.status !== "captured") {
      throw new AppError(
        "Payment has not been captured.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 6. FETCH RAZORPAY ORDER
    // --------------------------------

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (!razorpayOrder) {
      throw new AppError("Razorpay order not found.", statusCode.BAD_REQUEST);
    }

    // --------------------------------
    // 7. PAYMENT MUST BELONG TO ORDER
    // --------------------------------

    if (razorpayPayment.order_id !== razorpay_order_id) {
      throw new AppError(
        "Payment does not belong to this order.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 8. VERIFY ORDER AND PAYMENT AMOUNT
    // --------------------------------

    if (Number(razorpayOrder.amount) !== Number(razorpayPayment.amount)) {
      throw new AppError(
        "Payment amount does not match order amount.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 9. VERIFY FRONTEND TOTAL AMOUNT
    // --------------------------------

    const expectedAmountInPaise = Math.round(subscriptionTotalAmount * 100);

    if (Number(razorpayOrder.amount) !== expectedAmountInPaise) {
      throw new AppError(
        "Subscription amount does not match paid amount.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 10. PREVENT DUPLICATE PAYMENT
    // --------------------------------

    const duplicateQuery = `
      SELECT id
      FROM payments
      WHERE transactionid = $1
      LIMIT 1;
    `;

    const duplicateResult = await db.runQuery(duplicateQuery, [
      razorpay_payment_id,
    ]);

    if (duplicateResult.rows.length) {
      throw new AppError(
        "Payment has already been processed.",
        statusCode.BAD_REQUEST,
      );
    }

    // --------------------------------
    // 11. VALIDATE PLAN EXISTS
    // --------------------------------

    const planQuery = `
      SELECT id
      FROM plans
      WHERE id = $1
        AND status = 1
      LIMIT 1;
    `;

    const planResult = await db.runQuery(planQuery, [planid]);

    if (!planResult.rows.length) {
      throw new AppError("Plan not found.", statusCode.NOT_FOUND);
    }

    // --------------------------------
    // 12. VALIDATE LEAD EXISTS
    // --------------------------------

    const leadQuery = `
      SELECT id
      FROM leads
      WHERE id = $1
        AND status = 1
      LIMIT 1;
    `;

    const leadResult = await db.runQuery(leadQuery, [leadid]);

    if (!leadResult.rows.length) {
      throw new AppError("Lead not found.", statusCode.NOT_FOUND);
    }

    // --------------------------------
    // 13. CREATE SUBSCRIPTION
    // --------------------------------

    const subscriptionnumber = await generateSubscriptionNumber();

    const now = Date.now();

    const subscriptionQuery = `
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
        subscriptionstatus,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15
      )
      RETURNING *;
    `;

    const subscriptionValues = [
      subscriptionnumber,
      leadid,
      organizationid || null,
      planid,
      Number(billingcycle),
      startdate,
      enddate,
      subscriptionAmount,
      subscriptionDiscount,
      subscriptionTax,
      subscriptionTotalAmount,

      // Subscription Status
      1, // Active

      // Record Status
      1,

      now,
      now,
    ];

    const subscriptionResult = await db.runQuery(
      subscriptionQuery,
      subscriptionValues,
    );

    if (!subscriptionResult.rows.length) {
      throw new AppError(
        "Failed to create subscription.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    const createdSubscription = subscriptionResult.rows[0];

    // --------------------------------
    // 14. CREATE PAYMENT
    // --------------------------------

    const paymentnumber = await generatePaymentNumber();

    // 1 = Razorpay
    const paymentGateway = 1;

    const paymentQuery = `
      INSERT INTO payments
      (
        paymentnumber,
        subscriptionid,
        paymentgateway,
        transactionid,
        amount,
        currency,
        paymentmode,
        paymentdate,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11
      )
      RETURNING *;
    `;

    const paymentValues = [
      paymentnumber,

      createdSubscription.id,

      paymentGateway,

      razorpay_payment_id,

      subscriptionTotalAmount,

      razorpayPayment.currency || "INR",

      // Razorpay gives method like:
      // card / upi / netbanking / wallet
      razorpayPayment.method || "Online",

      now,

      1,

      now,

      now,
    ];

    const paymentResult = await db.runQuery(paymentQuery, paymentValues);

    if (!paymentResult.rows.length) {
      throw new AppError(
        "Payment record could not be created.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    // --------------------------------
    // 15. RESPONSE
    // --------------------------------

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Payment verified and subscription created successfully.",
      data: {
        subscription: createdSubscription,
        payment: paymentResult.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const body = req.body;

    let paymentnumber;
    let subscriptionid;
    let paymentgateway;
    let transactionid;
    let amount;
    let currency;
    let paymentmode;
    let paymentdate;

    paymentnumber = await generatePaymentNumber();

    if (Object.keys(body).includes("subscriptionid")) {
      subscriptionid = body.subscriptionid;
    } else {
      throw new AppError("Subscription is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("paymentgateway")) {
      paymentgateway = body.paymentgateway;
    } else {
      throw new AppError(
        "Payment Gateway is required.",
        statusCode.BAD_REQUEST,
      );
    }

    transactionid = Object.keys(body).includes("transactionid")
      ? body.transactionid
      : null;

    if (Object.keys(body).includes("amount")) {
      amount = body.amount;
    } else {
      throw new AppError("Amount is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("currency")) {
      currency = body.currency;
    } else {
      throw new AppError("Currency is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("paymentmode")) {
      paymentmode = body.paymentmode;
    } else {
      throw new AppError("Payment Mode is required.", statusCode.BAD_REQUEST);
    }

    if (Object.keys(body).includes("paymentdate")) {
      paymentdate = body.paymentdate;
    } else {
      throw new AppError("Payment Date is required.", statusCode.BAD_REQUEST);
    }

    const status = 1;
    const now = Date.now();

    const query = `
      INSERT INTO payments
      (
        paymentnumber,
        subscriptionid,
        paymentgateway,
        transactionid,
        amount,
        currency,
        paymentmode,
        paymentdate,
        status,
        createdat,
        updatedat
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *;
    `;

    const values = [
      paymentnumber,
      subscriptionid,
      paymentgateway,
      transactionid,
      amount,
      currency,
      paymentmode,
      paymentdate,
      status,
      now,
      now,
    ];

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError(
        "Failed to create payment.",
        statusCode.INTERNAL_SERVER_ERROR,
      );
    }

    await sendOnboardingMail(subscriptionid);

    return res.status(statusCode.CREATED).json({
      success: true,
      message: "Payment created successfully.",
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
      FROM payments
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
      FROM payments
      WHERE
        id = $1
        AND status = 1
      LIMIT 1;
    `;

    const { rows } = await db.runQuery(query, [id]);

    if (!rows.length) {
      throw new AppError("Payment not found.", statusCode.NOT_FOUND);
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
      "subscriptionid",
      "paymentgateway",
      "transactionid",
      "amount",
      "currency",
      "paymentmode",
      "paymentdate",
      "status",
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
      UPDATE payments
      SET
        ${updateFields.join(",\n        ")}
      WHERE
        id = $${values.length}
        AND status != -1
      RETURNING *;
    `;

    const { rows } = await db.runQuery(query, values);

    if (!rows.length) {
      throw new AppError("Payment not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Payment updated successfully.",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const deletePayment = async (req, res, next) => {
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
      UPDATE payments
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
      throw new AppError("Payment not found.", statusCode.NOT_FOUND);
    }

    return res.status(statusCode.OK).json({
      success: true,
      message: "Payment deleted successfully.",
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
  deletePayment,
  createOrder,
  verifyPayment,
};
