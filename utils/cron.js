import { CronJob } from "cron";
import https from "https";

const job = new CronJob(
  "*/14 * * * *",
  function () {
    console.log("Running scheduled job...");
    https
      .get(process.env.BACKEND_URL, (res) => {
        if (res.statusCode === 200) {
          console.log("GET request send successfully");
        } else {
          console.log("GET request failed", res.statusCode);
        }
      })
      .on("error", (e) => {
        console.error("Error while sending request", e);
      });
  },
  null,
  false,
  "UTC"
);

export default job;
