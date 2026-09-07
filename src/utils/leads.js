const db = require("../config/database");

const generateNumber = async () => {
  const query = `
    SELECT leadnumber
    FROM leads
    WHERE leadnumber IS NOT NULL
    ORDER BY createdat DESC
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query);

  if (!rows.length) {
    return "000001";
  }

  const lastNumber = String(rows[0].number);

  // Remove any existing prefix such as LED
  const numericPart = lastNumber.replace(/^[A-Za-z]+/, "");

  const number = parseInt(numericPart, 10);

  if (Number.isNaN(number)) {
    return "000001";
  }

  const nextNumber = number + 1;

  return String(nextNumber).padStart(6, "0");
};

module.exports = generateNumber;
