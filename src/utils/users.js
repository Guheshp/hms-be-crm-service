const db = require("../config/database");

const generateUserNumber = async () => {
  const query = `
    SELECT usernumber
    FROM users
    ORDER BY createdat DESC
    LIMIT 1;
  `;

  const { rows } = await db.runQuery(query);

  if (!rows.length) {
    return "USR000001";
  }

  const lastNumber = rows[0].usernumber;

  const number = parseInt(lastNumber.replace("USR", ""), 10);

  const nextNumber = number + 1;

  return `USR${String(nextNumber).padStart(6, "0")}`;
};

module.exports = generateUserNumber;
