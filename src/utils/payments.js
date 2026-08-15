const db = require("../config/database");

const generatePaymentNumber = async () => {
  const query = `
    SELECT paymentnumber
    FROM payments
    ORDER BY createdat DESC
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query);

  if (!rows.length) {
    return "PAY000001";
  }

  const lastNumber = rows[0].paymentnumber;

  const number = parseInt(lastNumber.replace("PAY", ""), 10);

  const nextNumber = number + 1;

  return `PAY${String(nextNumber).padStart(6, "0")}`;
};
const getPaymentMode = (method) => {
  switch (method) {
    case "upi":
      return 1;

    case "card":
      return 2;

    case "netbanking":
      return 3;

    case "wallet":
      return 4;

    default:
      return null;
  }
};

module.exports = { generatePaymentNumber, getPaymentMode };
