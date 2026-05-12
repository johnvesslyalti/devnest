import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

@Processor("email")
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "welcome-email":
        console.log(`Sending welcome email to ${job.data.email}`);
        // TODO: Implement actual email sending logic here
        return {};
      default:
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Simulate error occasionally for testing
        // if (Math.random() < 0.2) throw new Error("Simulated email failure");
        return {}; // Assuming it should complete successfully if no error is thrown
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Job ${job.id} of type ${job.name} failed`, error.stack);
  }
}
