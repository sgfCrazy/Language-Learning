import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): { id: string; client: string } => {
    const req = ctx.switchToHttp().getRequest<{ user: { id: string; client: string } }>();
    return req.user;
  },
);
