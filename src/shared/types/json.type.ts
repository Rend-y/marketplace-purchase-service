export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/**
 * Declared as an interface with an index signature on purpose: `Record<string, JsonValue>` makes
 * the alias circular and TypeScript silently degrades `JsonValue` to `any`.
 */

export interface JsonObject {
  [key: string]: JsonValue;
}
