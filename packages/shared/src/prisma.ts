// 仅导出 Prisma 生成的类型（编译期擦除，前端 bundle 不会引入 @prisma/client 运行时）。
// 服务端通过 ts-jest 的 moduleNameMapper 解析到源码；前端使用 packages/shared/dist。
export type * from '@prisma/client';
