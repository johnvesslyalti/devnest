import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";

@Injectable()
export class EmailService implements OnModuleDestroy {
  constructor(@InjectQueue("email") private emailQueue: Queue) {}

  async onModuleDestroy() {
    await this.emailQueue.close();
    const queueAny = this.emailQueue as any;

    if (
      queueAny.connection?.status !== "closed" &&
      typeof this.emailQueue.disconnect === "function"
    ) {
      this.emailQueue.disconnect();
    }
  }

  async sendWelcomeEmail(userId: string, email: string) {
    await this.emailQueue.add(
      "welcome-email",
      {
        userId,
        email,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    );
  }
}
