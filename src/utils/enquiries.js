const db = require("../config/database");

const generateEnquiryNumber = async () => {
  try {
    const query = `
            SELECT enquirynumber
            FROM enquiries
            ORDER BY createdat DESC
            LIMIT 1;
        `;

    const { rows } = await db.runQuery(query);

    if (!rows.length) {
      return "ENQ000001";
    }

    const lastEnquiryNumber = rows[0].enquirynumber;

    const sequence = parseInt(lastEnquiryNumber.substring(3), 10) + 1;

    return `ENQ${sequence.toString().padStart(6, "0")}`;
  } catch (error) {
    console.error("Generate Enquiry Number Error:", error);
    throw error;
  }
};

module.exports = generateEnquiryNumber;
