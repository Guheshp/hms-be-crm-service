const db = require("../config/database");

const generateLeadNumber = async () => {
  const query = `
    SELECT leadnumber
    FROM leads
    ORDER BY createdat DESC
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query);

  if (!rows.length) {
    return "LED000001";
  }

  const lastNumber = rows[0].leadnumber;

  const number = parseInt(lastNumber.replace("LED", ""), 10);

  const nextNumber = number + 1;

  return `LED${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateLeadNumber;
