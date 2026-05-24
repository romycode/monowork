import type { JSONSchema, RegistryToJSONSchemaParams } from "zod/v4/core";
import { $ZodRegistry, $ZodType } from "zod/v4/core";
import type { SchemaRegistryMeta } from "../esm/registry.js";
export type ZodToJsonConfig = {} & Omit<RegistryToJSONSchemaParams, "io" | "metadata" | "cycles" | "reused" | "uri">;
declare const deleteInvalidProperties: (schema: JSONSchema.BaseSchema) => Omit<JSONSchema.BaseSchema, "id" | "$schema">;
export declare const zodSchemaToJson: (zodSchema: $ZodType, registry: $ZodRegistry<SchemaRegistryMeta>, io: "input" | "output", config: ZodToJsonConfig) => ReturnType<typeof deleteInvalidProperties>;
export declare const zodRegistryToJson: (registry: $ZodRegistry<SchemaRegistryMeta>, io: "input" | "output", config: ZodToJsonConfig) => Record<string, JSONSchema.BaseSchema>;
export {};
