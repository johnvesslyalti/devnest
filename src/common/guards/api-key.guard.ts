import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers["x-api-key"];

    // valid-api-key is just for demonstration
    // In a real app, this would come from a database or env var
    // For now, if no key is present, we permit it to not block existing flows completely,
    // OR we enforce it.
    // Let's enforce it for routes that use this guard to demonstrate functionality.

    // Check if we want to enforce it globally or just for specific routes.
    // For this generic guard, let's assume we validate against a static key if present,
    // or maybe simple check.

    // Simplifying: If header is present, it must be correct. If not, maybe allow (pass-through) or block?
    // Let's strictly block to show "Guard" works.
    // UPDATE: To ensure we don't break the whole app during this refactor, I'll make it optional
    // unless the route explicitly needs it, but here I am defining the Class.

    if (apiKey && apiKey !== "secret-key") {
      throw new UnauthorizedException("Invalid API Key");
    }

    return true;
  }
}
