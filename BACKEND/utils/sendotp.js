import sgMail from "@sendgrid/mail";

export default async function sendOtp(email, otp) {
  // Initialize SendGrid with API key
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: process.env.SENDGRID_SENDER_EMAIL, // verified sender email
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
  };

  try {
    await sgMail.send(msg);
    console.log("OTP email sent successfully!");
  } catch (err) {
    console.error("SendGrid Email Error:", err.response?.body || err);
  }
}

// import nodemailer from "nodemailer";

// export default async function sendOtp(email, otp) {
//   const transporter = nodemailer.createTransport({
//     secure: true,
//     host: "smtp.gmail.com",
//     port: 465,
//     auth: {
//       user: process.env.MAIL_USER,
//       pass: process.env.MAIL_PASSWORD,
//     },
//   });

//   const mailOptions = {
//     from: `"Questify" <${process.env.MAIL_USER}>`,
//     to: email,
//     subject: "Your OTP Code",
//     text: `Your OTP is ${otp}.It will expire in 5 minutes`,
//   };

//   await transporter.sendMail(mailOptions);

// }
