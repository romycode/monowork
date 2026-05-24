"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("zod/v4/core");
const errors = require("./errors.cjs");
const registry = require("./registry.cjs");
const utils = require("./utils.cjs");
const zodToJson = require("./zod-to-json.cjs");
const defaultSkipList = [
  "/documentation/",
  "/documentation/initOAuth",
  "/documentation/json",
  "/documentation/uiConfig",
  "/documentation/yaml",
  "/documentation/*",
  "/documentation/static/*"
];
const createJsonSchemaTransform = ({
  skipList = defaultSkipList,
  schemaRegistry = core.globalRegistry,
  zodToJsonConfig = {}
}) => {
  const zodSchemaToJsonCache = /* @__PURE__ */ new WeakMap();
  return (document) => {
    utils.assertIsOpenAPIObject(document);
    const { schema, url } = document;
    if (!schema) {
      return {
        schema,
        url
      };
    }
    const target = utils.getJSONSchemaTarget(document.openapiObject.openapi);
    const config = {
      target,
      ...zodToJsonConfig
    };
    const { inputRegistry, outputRegistry } = registry.generateIORegistries(schemaRegistry);
    const { response, headers, querystring, body, params, hide, ...rest } = schema;
    const transformed = {};
    if (skipList.includes(url) || hide) {
      transformed.hide = true;
      return { schema: transformed, url };
    }
    const zodSchemas = { headers, querystring, body, params };
    for (const prop in zodSchemas) {
      const zodSchema = zodSchemas[prop];
      if (!zodSchema) {
        continue;
      }
      const cacheKey = `input|${config.target}`;
      let perSchema = zodSchemaToJsonCache.get(zodSchema);
      if (!perSchema) {
        perSchema = /* @__PURE__ */ new Map();
        zodSchemaToJsonCache.set(zodSchema, perSchema);
      }
      let jsonSchema = perSchema.get(cacheKey);
      if (!jsonSchema) {
        jsonSchema = zodToJson.zodSchemaToJson(zodSchema, inputRegistry, "input", config);
        perSchema.set(cacheKey, jsonSchema);
      }
      transformed[prop] = jsonSchema;
    }
    if (response) {
      transformed.response = {};
      for (const prop in response) {
        const zodSchema = resolveSchema(response[prop]);
        const cacheKey = `output|${config.target}`;
        let perSchema = zodSchemaToJsonCache.get(zodSchema);
        if (!perSchema) {
          perSchema = /* @__PURE__ */ new Map();
          zodSchemaToJsonCache.set(zodSchema, perSchema);
        }
        let jsonSchema = perSchema.get(cacheKey);
        if (!jsonSchema) {
          jsonSchema = zodToJson.zodSchemaToJson(zodSchema, outputRegistry, "output", config);
          perSchema.set(cacheKey, jsonSchema);
        }
        transformed.response[prop] = jsonSchema;
      }
    }
    for (const prop in rest) {
      const meta = rest[prop];
      if (meta) {
        transformed[prop] = meta;
      }
    }
    return { schema: transformed, url };
  };
};
const jsonSchemaTransform = createJsonSchemaTransform({});
const createJsonSchemaTransformObject = ({
  schemaRegistry = core.globalRegistry,
  zodToJsonConfig = {}
}) => (document) => {
  utils.assertIsOpenAPIObject(document);
  const target = utils.getJSONSchemaTarget(document.openapiObject.openapi);
  const config = {
    target,
    ...zodToJsonConfig
  };
  const { inputRegistry, outputRegistry } = registry.generateIORegistries(schemaRegistry);
  const inputSchemas = zodToJson.zodRegistryToJson(inputRegistry, "input", config);
  const outputSchemas = zodToJson.zodRegistryToJson(outputRegistry, "output", config);
  return {
    ...document.openapiObject,
    components: {
      ...document.openapiObject.components,
      schemas: {
        ...document.openapiObject.components?.schemas,
        ...inputSchemas,
        ...outputSchemas
      }
    }
  };
};
const jsonSchemaTransformObject = createJsonSchemaTransformObject({});
const validatorCompiler = ({ schema }) => (data) => {
  const result = core.safeDecode(schema, data);
  if (result.error) {
    return { error: errors.createValidationError(result.error) };
  }
  return { value: result.data };
};
function resolveSchema(maybeSchema) {
  if (maybeSchema instanceof core.$ZodType) {
    return maybeSchema;
  }
  if ("properties" in maybeSchema && maybeSchema.properties instanceof core.$ZodType) {
    return maybeSchema.properties;
  }
  throw new errors.InvalidSchemaError(JSON.stringify(maybeSchema));
}
const createSerializerCompiler = (options) => ({ schema: maybeSchema, method, url }) => (data) => {
  const schema = resolveSchema(maybeSchema);
  const result = core.safeEncode(schema, data);
  if (result.error) {
    throw new errors.ResponseSerializationError(method, url, { cause: result.error });
  }
  return JSON.stringify(result.data, options?.replacer);
};
const serializerCompiler = createSerializerCompiler({});
exports.createJsonSchemaTransform = createJsonSchemaTransform;
exports.createJsonSchemaTransformObject = createJsonSchemaTransformObject;
exports.createSerializerCompiler = createSerializerCompiler;
exports.jsonSchemaTransform = jsonSchemaTransform;
exports.jsonSchemaTransformObject = jsonSchemaTransformObject;
exports.serializerCompiler = serializerCompiler;
exports.validatorCompiler = validatorCompiler;
//# sourceMappingURL=core.cjs.map
