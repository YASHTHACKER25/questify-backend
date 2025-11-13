import sgMail from "@sendgrid/mail";

export default async function sendOtp(email, otp) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // Email to the actual user
  const userMsg = {
    to: email,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
  };

  // Email copy to you (Yash)
  const adminMsg = {
    to: "yashthacker5340@gmail.com",
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: `OTP SENT to ${email}`,
    text: `OTP sent to ${email}: ${otp}`,
    html: `<p>OTP sent to <b>${email}</b>: <b>${otp}</b></p>`,
  };

  try {
    await sgMail.send(userMsg);   // send to user
    await sgMail.send(adminMsg);  // send to you
    console.log("OTP sent to user and copy sent to admin!");
  } catch (err) {
    console.error("SendGrid Email Error:", err.response?.body || err);
  }
}
