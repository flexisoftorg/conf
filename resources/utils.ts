export function notEmpty<T>(value: T | undefined): value is T {
  return value !== null && value !== undefined;
}
