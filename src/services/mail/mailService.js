const transporter = require("./transporter");

const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
};

module.exports = {
  sendMail,
};
