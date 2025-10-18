export type Creation<T, K extends keyof T> = Omit<T, "createdAt" | "updatedAt" | K>;
export type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

