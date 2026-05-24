const assertIsOpenAPIObject = (obj) => {
  if ("swaggerObject" in obj) {
    throw new Error("This package currently does not support component references for Swagger 2.0");
  }
};
const getReferenceUri = (input) => {
  const id = input.replace(/^#\/(?:\$defs|definitions|components\/schemas)\//, "");
  return `#/components/schemas/${id}`;
};
const getJSONSchemaTarget = (version = "3.0.0") => {
  if (version.startsWith("3.0")) {
    return "openapi-3.0";
  }
  return "draft-2020-12";
};
export {
  assertIsOpenAPIObject,
  getJSONSchemaTarget,
  getReferenceUri
};
//# sourceMappingURL=utils.js.map
