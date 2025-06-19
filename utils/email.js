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
