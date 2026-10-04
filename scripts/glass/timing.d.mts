export function withGlassScope<T>(scope: string, task: () => T): T;
export function timeGlassOperation<T>(operation: string, task: () => T | Promise<T>): Promise<T>;
