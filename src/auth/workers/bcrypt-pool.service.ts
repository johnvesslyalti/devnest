import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Piscina = require("piscina");

@Injectable()
export class BcryptPoolService implements OnModuleInit, OnModuleDestroy {
  private piscina: any;

  onModuleInit() {
    const candidateWorkerPaths = [
      path.resolve(__dirname, "bcrypt.worker.js"),
      path.resolve(__dirname, "bcrypt.worker-loader.js"),
      path.resolve(
        process.cwd(),
        "dist",
        "auth",
        "workers",
        "bcrypt.worker.js",
      ),
      path.resolve(
        process.cwd(),
        "src",
        "auth",
        "workers",
        "bcrypt.worker-loader.js",
      ),
    ];

    const workerPath =
      candidateWorkerPaths.find((candidatePath) =>
        fs.existsSync(candidatePath),
      ) ?? path.resolve(__dirname, "bcrypt.worker-loader.js");

    const piscinaOptions: any = {
      filename: workerPath,
      // Set reasonable limits based on CPUs to avoid starving the main thread
      minThreads: 2,
    };

    this.piscina = new Piscina(piscinaOptions);
    this.piscina.on("error", (err: any) => {
      console.error("Piscina error inside worker:", err);
    });
  }

  async onModuleDestroy() {
    if (this.piscina) {
      await this.piscina.destroy();
    }
  }

  async hash(
    password: string,
    saltOrRounds: number | string = 10,
  ): Promise<string> {
    return this.piscina.run({
      type: "hash",
      payload: { password, saltOrRounds },
    });
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return this.piscina.run({ type: "compare", payload: { data, encrypted } });
  }
}
