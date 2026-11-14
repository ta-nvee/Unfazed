
async function sendEmail({ to, subject, message }) {
  console.log("Email notification (stub):", {
    to,
    subject,
    message,
  });

  return {
    success: true,
    message: "Email notification logged; no email was sent.",
  };
}

async function sendWhatsApp({ phone, message }) {
  console.log("WhatsApp notification (stub):", {
    phone,
    message,
  });

  return {
    success: true,
    message: "WhatsApp notification logged; no message was sent.",
  };
}

module.exports = {
  sendEmail,
  sendWhatsApp,
};
