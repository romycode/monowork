import { globalRegistry, safeEncode, safeDecode, $ZodType } from "zod/v4/core";
import { ResponseSerializationError, createValidationError, InvalidSchemaError } from "./errors.js";
import { generateIORegistries } from "./registry.js";
import { assertIsOpenAPIObject, getJSONSchemaTarget } from "./utils.js";
import { zodSchemaToJson, zodRegistryToJson } from "./zod-to-json.js";
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
  schemaRegistry = globalRegistry,
  zodToJsonConfig = {}
}) => {
  const zodSchemaToJsonCache = /* @__PURE__ */ new WeakMap();
  return (document) => {
    assertIsOpenAPIObject(document);
    const { schema, url } = document;
    if (!schema) {
      return {
        schema,
        url
      };
    }
    const target = getJSONSchemaTarget(document.openapiObject.openapi);
    const config = {
      target,
      ...zodToJsonConfig
    };
    const { inputRegistry, outputRegistry } = generateIORegistries(schemaRegistry);
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
        jsonSchema = zodSchemaToJson(zodSchema, inputRegistry, "input", config);
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
          jsonSchema = zodSchemaToJson(zodSchema, outputRegistry, "output", config);
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
  schemaRegistry = globalRegistry,
  zodToJsonConfig = {}
}) => (document) => {
  assertIsOpenAPIObject(document);
  const target = getJSONSchemaTarget(document.openapiObject.openapi);
  const config = {
    target,
    ...zodToJsonConfig
  };
  const { inputRegistry, outputRegistry } = generateIORegistries(schemaRegistry);
  const inputSchemas = zodRegistryToJson(inputRegistry, "input", config);
  const outputSchemas = zodRegistryToJson(outputRegistry, "output", config);
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
  const result = safeDecode(schema, data);
  if (result.error) {
    return { error: createValidationError(result.error) };
  }
  return { value: result.data };
};
function resolveSchema(maybeSchema) {
  if (maybeSchema instanceof $ZodType) {
    return maybeSchema;
  }
  if ("properties" in maybeSchema && maybeSchema.properties instanceof $ZodType) {
    return maybeSchema.properties;
  }
  throw new InvalidSchemaError(JSON.stringify(maybeSchema));
}
const createSerializerCompiler = (options) => ({ schema: maybeSchema, method, url }) => (data) => {
  const schema = resolveSchema(maybeSchema);
  const result = safeEncode(schema, data);
  if (result.error) {
    throw new ResponseSerializationError(method, url, { cause: result.error });
  }
  return JSON.stringify(result.data, options?.replacer);
};
const serializerCompiler = createSerializerCompiler({});
export {
  createJsonSchemaTransform,
  createJsonSchemaTransformObject,
  createSerializerCompiler,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler
};
//# sourceMappingURL=core.js.map
