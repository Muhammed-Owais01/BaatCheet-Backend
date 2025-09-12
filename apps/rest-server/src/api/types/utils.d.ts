export type Creation<T, K extends keyof T> = Omit<T, "createdAt" | "updatedAt" | K>;
