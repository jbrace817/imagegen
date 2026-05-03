import type { ZodType } from "zod";

export function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  return convertDef(def);
}

function convertDef(def: Record<string, unknown>): Record<string, unknown> {
  const typeName = def.typeName as string;

  switch (typeName) {
    case "ZodObject": {
      const shape = def.shape as () => Record<string, { _def: Record<string, unknown> }>;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      const shapeObj = shape();

      for (const [key, value] of Object.entries(shapeObj)) {
        const fieldDef = value._def;
        const isOptional = fieldDef.typeName === "ZodOptional" || fieldDef.typeName === "ZodDefault";
        properties[key] = convertDef(fieldDef);
        if (!isOptional) required.push(key);
      }

      return { type: "object", properties, required };
    }
    case "ZodString":
      return { type: "string", ...(def.description ? { description: def.description as string } : {}) };
    case "ZodNumber":
      return { type: "number", ...(def.description ? { description: def.description as string } : {}) };
    case "ZodBoolean":
      return { type: "boolean", ...(def.description ? { description: def.description as string } : {}) };
    case "ZodEnum": {
      const values = def.values as string[];
      return { type: "string", enum: values, ...(def.description ? { description: def.description as string } : {}) };
    }
    case "ZodDefault": {
      const inner = convertDef(def.innerType as unknown as Record<string, unknown>);
      const defaultValue = (def as unknown as { defaultValue: () => unknown }).defaultValue();
      return { ...inner, default: defaultValue, ...(def.description ? { description: def.description as string } : {}) };
    }
    case "ZodOptional": {
      const inner = (def.innerType as { _def: Record<string, unknown> })._def;
      return convertDef(inner);
    }
    case "ZodUnion": {
      const options = (def.options as Array<{ _def: Record<string, unknown> }>).map((o) => convertDef(o._def));
      return { oneOf: options, ...(def.description ? { description: def.description as string } : {}) };
    }
    case "ZodLiteral": {
      const value = def.value;
      return { type: typeof value, const: value };
    }
    default:
      return { type: "string" };
  }
}
