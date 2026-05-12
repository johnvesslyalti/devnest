import { Module } from "@nestjs/common";
import { EmailModule } from "./email.module";
import { EmailProcessor } from "./email.processor";

@Module({
  imports: [EmailModule],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
