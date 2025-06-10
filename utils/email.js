// import nodemailer from "nodemailer";

// const sendEmail = async (options) => {
//   try {
//     // CREATE TRANSPORTER using environment variables
//     const transporter = nodemailer.createTransport({
//       host: process.env.EMAIL_PORT,
//       port: process.env.EMAIL_PORT,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//       tls:
//         process.env.NODE_ENV === "development"
//           ? { rejectUnauthorized: false }
//           : undefined,
//     });

//     // Verify connection before sending
//     await transporter.verify();

//     //   DEFINE EMAIL OPTIONS
//     const mailOptions = {
//       from: `Finance Tracker <${process.env.EMAIL_FROM}>`,
//       to: options.email,
//       subject: options.subject,
//       text: options.text || undefined,
//       html: options.html || undefined,
//     };

//     // Actually send the email
//     const info = await transporter.sendMail(mailOptions);

//     return true;
//   } catch (error) {
//     console.error("SMTP Error:", error); // Optional detailed logging
//     throw new Error(`Email could not be sent: ${error.message}`);
//   }
// };

// export default sendEmail;

import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ email, subject, html }) => {
  try {
    await resend.emails.send({
      from: "Jira-clone<onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Resend API error:", error);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

export default sendEmail;
