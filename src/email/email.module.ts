import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { EmailService } from "./email.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "email",
      forceDisconnectOnShutdown: true,
    }),
    BullBoardModule.forFeature({
      name: "email",
      adapter: BullMQAdapter,
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
