import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import * as http from "http";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log("Worker application started and listening for jobs...");

  // Heartbeat server for Render/Koyeb health checks
  // This tells the cloud provider the app is healthy and running
  const port = process.env.PORT || 8080;
  http
    .createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Worker is alive\n");
    })
    .listen(port, () => {
      console.log(`Heartbeat server listening on port ${port}`);
    });
}
bootstrap();
