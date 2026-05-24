"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("zod/v4/core");
const utils = require("./utils.cjs");
const SCHEMA_REGISTRY_ID_PLACEHOLDER = "__SCHEMA__ID__PLACEHOLDER__";
const SCHEMA_URI_PLACEHOLDER = "__SCHEMA__PLACEHOLDER__";
function isZodDate(entity) {
  return entity instanceof core.$ZodType && entity._zod.def.type === "date";
}
function isZodUnion(entity) {
  return entity instanceof core.$ZodType && entity._zod.def.type === "union";
}
function isZodUndefined(entity) {
  return entity instanceof core.$ZodType && entity._zod.def.type === "undefined";
}
const getOverride = (ctx, io) => {
  if (isZodUnion(ctx.zodSchema)) {
    ctx.jsonSchema.anyOf = ctx.jsonSchema.anyOf?.filter((schema) => Object.keys(schema).length > 0);
  }
  if (isZodDate(ctx.zodSchema)) {
    if (io === "output") {
      ctx.jsonSchema.type = "string";
      ctx.jsonSchema.format = "date-time";
    }
  }
  if (isZodUndefined(ctx.zodSchema)) {
    if (io === "output") {
      ctx.jsonSchema.type = "null";
    }
  }
};
const composeOverride = (io, override) => {
  return (ctx) => {
    getOverride(ctx, io);
    override?.(ctx);
  };
};
const deleteInvalidProperties = (schema) => {
  const object = { ...schema };
  delete object.id;
  delete object.$schema;
  delete object.$id;
  return object;
};
const zodSchemaToJson = (zodSchema, registry, io, config) => {
  const schemaRegistryEntry = registry.get(zodSchema);
  if (schemaRegistryEntry?.id) {
    return { $ref: utils.getReferenceUri(schemaRegistryEntry.id) };
  }
  const tempRegistry = new core.$ZodRegistry();
  tempRegistry.add(zodSchema, { id: SCHEMA_REGISTRY_ID_PLACEHOLDER });
  const {
    schemas: { [SCHEMA_REGISTRY_ID_PLACEHOLDER]: result }
  } = core.toJSONSchema(tempRegistry, {
    ...config,
    io,
    target: config.target,
    metadata: registry,
    unrepresentable: config.unrepresentable ?? "any",
    cycles: "ref",
    reused: "inline",
    /**
     * The uri option only allows customizing the base path of the `$ref`, and it automatically appends a path to it.
     * As a workaround, we set a placeholder that looks something like this.
     * @see jsonSchemaReplaceRef
     * @see https://github.com/colinhacks/zod/issues/4750
     */
    uri: () => SCHEMA_URI_PLACEHOLDER,
    override: composeOverride(io, config.override)
  });
  const jsonSchema = deleteInvalidProperties(result);
  return JSON.parse(JSON.stringify(jsonSchema), (__key, value) => {
    if (typeof value === "string" && value.startsWith(SCHEMA_URI_PLACEHOLDER)) {
      return utils.getReferenceUri(value.slice(SCHEMA_URI_PLACEHOLDER.length));
    }
    return value;
  });
};
const zodRegistryToJson = (registry, io, config) => {
  const result = core.toJSONSchema(registry, {
    ...config,
    io,
    target: config.target,
    metadata: registry,
    unrepresentable: config.unrepresentable ?? "any",
    cycles: "ref",
    reused: "inline",
    uri: (id) => utils.getReferenceUri(id),
    override: composeOverride(io, config.override)
  }).schemas;
  const jsonSchemas = {};
  for (const id in result) {
    jsonSchemas[id] = deleteInvalidProperties(result[id]);
  }
  return jsonSchemas;
};
exports.zodRegistryToJson = zodRegistryToJson;
exports.zodSchemaToJson = zodSchemaToJson;
//# sourceMappingURL=zod-to-json.cjs.map
