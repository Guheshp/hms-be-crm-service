const enquiryCreated = (data) => {
  return `
        <h2>New Enquiry Received</h2>

        <p><b>Hospital :</b> ${data.hospitalname}</p>

        <p><b>Contact :</b> ${data.contactperson}</p>

        <p><b>Email :</b> ${data.email}</p>

        <p><b>Phone :</b> ${data.phone}</p>

        <p><b>Remarks :</b> ${data.remarks}</p>
    `;
};

module.exports = enquiryCreated;
