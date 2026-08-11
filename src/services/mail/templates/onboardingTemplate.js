module.exports = ({ name, hospitalname, onboardingUrl }) => {
  return `
    <h2>Welcome to HMS</h2>

    <p>Hi ${name},</p>

    <p>Your payment for <b>${hospitalname}</b> has been completed successfully.</p>

    <p>Please click the link below to create your organization.</p>

    <p>
      <a href="${onboardingUrl}">
        Complete Organization Setup
      </a>
    </p>

    <p>If the button doesn't work, use this link:</p>

    <p>${onboardingUrl}</p>

    <br>

    <p>Thanks,<br/>HMS Team</p>
  `;
};
