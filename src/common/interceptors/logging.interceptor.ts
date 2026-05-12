import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl } = request;
    const userAgent = request.get("user-agent") || "";
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const contentLength = response.get("content-length") || 0;
          this.logger.log(
            `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${Date.now() - now}ms`,
          );
        },
        error: (error: any) => {
          const statusCode = error?.status || 500;
          this.logger.error(
            `${method} ${originalUrl} ${statusCode} - ${userAgent} ${Date.now() - now}ms`,
            error instanceof Error ? error.stack : undefined,
          );
        },
      }),
    );
  }
}
