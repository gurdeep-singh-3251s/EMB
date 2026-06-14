import { CronJob } from "cron";
import type { Env } from "@repo/config";
import ServiceProvider from "./ServiceProvider";

export function startGurdeepCronFetchEmails(
  env: Env,
  serviceProvider: ServiceProvider,
) {
  const job = new CronJob(env.cronSchedule, async () => {
    const result = await serviceProvider.emails.runner();

    if (!result.success) {
      console.error(`[gurdeep-cron] Fetch emails failed: ${result.message}`);
      return;
    }

    console.log(`[gurdeep-cron] Fetch complete — enqueued ${result.data.enqueued} job(s)`);
  });

  job.start();
  console.log(`[gurdeep-cron] Scheduled: ${env.cronSchedule}`);
  return job;
}

export default startGurdeepCronFetchEmails;
