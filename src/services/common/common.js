const db = require("../../config/database");

const { statusCode } = require("../../constants/common");
const AppError = require("../../utils/appError");
const { sendMail } = require("../mail/mailService");
const onboardingTemplate = require("../mail/templates/onboardingTemplate");

const sendOnboardingMail = async (subscriptionid) => {
  const query = `
    SELECT
      e.contactperson,
      e.email,
      e.hospitalname
    FROM subscriptions s
    INNER JOIN leads l
      ON s.leadid = l.id
    INNER JOIN enquiries e
      ON l.enquiryid = e.id
    WHERE s.id = $1
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query, [subscriptionid]);

  if (!rows.length) {
    throw new AppError("Subscription not found.", statusCode.NOT_FOUND);
  }

  const onboardingUrl = `${process.env.AUTH_SERVICE_URL}/onboarding?subscriptionid=${subscriptionid}`;

  await sendMail({
    to: rows[0].email,
    subject: "Complete Your HMS Setup",
    html: onboardingTemplate({
      name: rows[0].contactperson,
      hospitalname: rows[0].hospitalname,
      onboardingUrl,
    }),
  });
};

const updateLeadWonStatus = async (leadid) => {
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

  return rows[0];
};

module.exports = {
  sendOnboardingMail,
  updateLeadWonStatus,
};
