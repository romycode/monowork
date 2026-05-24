import { $ZodRegistry } from "zod/v4/core";
const getSchemaId = (id, io) => {
  return io === "input" ? `${id}Input` : id;
};
class WeakMapWithFallback extends WeakMap {
  constructor(fallback) {
    super();
    this.fallback = fallback;
  }
  fallback;
  get(key) {
    return super.get(key) ?? this.fallback.get(key);
  }
  has(key) {
    return super.has(key) || this.fallback.has(key);
  }
}
const copyRegistry = (inputRegistry, idReplaceFn) => {
  const outputRegistry = new $ZodRegistry();
  outputRegistry._map = new WeakMapWithFallback(inputRegistry._map);
  inputRegistry._idmap.forEach((schema, id) => {
    outputRegistry.add(schema, {
      ...inputRegistry._map.get(schema),
      id: idReplaceFn(id)
    });
  });
  return outputRegistry;
};
const generateIORegistries = (baseRegistry) => {
  const inputRegistry = copyRegistry(baseRegistry, (id) => getSchemaId(id, "input"));
  const outputRegistry = copyRegistry(baseRegistry, (id) => getSchemaId(id, "output"));
  inputRegistry._idmap.forEach((_, id) => {
    if (outputRegistry._idmap.has(id)) {
      throw new Error(
        `Collision detected for schema "${id}". There is already an input schema with the same name.`
      );
    }
  });
  return { inputRegistry, outputRegistry };
};
export {
  generateIORegistries
};
//# sourceMappingURL=registry.js.map
