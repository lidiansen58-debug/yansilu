import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const SCHEMA_ROOT = path.join(process.cwd(), "schemas");

export async function readSchema(name) {
  const raw = await fs.readFile(path.join(SCHEMA_ROOT, name), "utf8");
  return JSON.parse(raw);
}

export function validateSchemaValue(schema, value, location = "$") {
  if (!schema || typeof schema !== "object") return;

  if (Array.isArray(schema.type)) {
    const allowed = schema.type;
    const matches = allowed.some((type) => matchesType(type, value));
    assert.equal(matches, true, `${location} expected one of ${allowed.join(", ")}`);
  } else if (schema.type) {
    assert.equal(matchesType(schema.type, value), true, `${location} expected type ${schema.type}`);
  }

  if (schema.enum) {
    assert.equal(schema.enum.includes(value), true, `${location} expected enum value`);
  }

  if ((schema.type === "object" || (Array.isArray(schema.type) && value && typeof value === "object" && !Array.isArray(value))) && value !== null) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      assert.equal(Object.prototype.hasOwnProperty.call(value, key), true, `${location}.${key} is required`);
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        assert.equal(Object.prototype.hasOwnProperty.call(schema.properties, key), true, `${location}.${key} is not allowed`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) validateSchemaValue(childSchema, value[key], `${location}.${key}`);
    }
  }

  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchemaValue(schema.items, item, `${location}[${index}]`));
  }
}

function matchesType(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}
