import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SG_API_KEY);
import ejs from "ejs";
import moment from "moment";

export const sendPaymentFailedEmail = async (email, workspaceName, expAt) => {
  const msg = {
    to: email,
    from: "pingpal@jackcrane.rocks",
    subject: "🟥 [URGENT] PingPal payment failed",
    html: ejs.renderFile("../emails/paymentFailed.ejs", {
      workspaceName,
      expAt: new moment(expAt).format("MMMM Do YYYY, h:mm a"),
    }),
  };
  const res = await sgMail.send(msg);
  return res;
};
