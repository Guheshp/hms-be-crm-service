const otpTemplate = ({ firstname, otp }) => {
  return `
    <h2>Login OTP</h2>

    <p>Hi ${firstname},</p>

    <p>Your OTP for login is:</p>

    <h1 style="letter-spacing:4px;">${otp}</h1>

    <p>This OTP is valid for <b>5 minutes</b>.</p>

    <p>If you did not request this OTP, please ignore this email.</p>

    <br>

    <p>Thanks,</p>

    <p>HMS Team</p>
  `;
};

module.exports = otpTemplate;
