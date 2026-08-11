const db = require("../config/database");

const generateSubscriptionNumber = async () => {
  const query = `
    SELECT subscriptionnumber
    FROM subscriptions
    ORDER BY createdat DESC
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query);

  if (!rows.length) {
    return "SUB000001";
  }

  const lastNumber = rows[0].subscriptionnumber;

  const number = parseInt(lastNumber.replace("SUB", ""), 10);

  const nextNumber = number + 1;

  return `SUB${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateSubscriptionNumber;
