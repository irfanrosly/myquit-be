import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ statusCode: number; data: unknown }> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        data: data ?? null,
      })),
    );
  }
}
