import { z } from "zod";

export const MAX_SKILLMAP_DEPTH = 4;
export const MAX_SKILLMAP_NODES = 50;
export const MAX_SKILLMAP_RESPONSE_BYTES = 80_000;

type SkillMapNodeShape = {
  title: string;
  description: string;
  tags: string[];
  children: SkillMapNodeShape[];
};

export const generatedSkillMapSchema: z.ZodType<SkillMapNodeShape> = z.lazy(() =>
  z.object({
    title: z.string().trim().min(1).max(50),
    description: z.string().trim().min(1).max(500),
    tags: z.array(z.string().trim().min(1).max(30)).max(5),
    children: z.array(generatedSkillMapSchema),
  }),
);

export const generateSkillMapRequestSchema = z.object({
  theme: z.string().trim().min(2).max(100),
});

export const generateSkillMapResponseSchema = z.object({
  data: generatedSkillMapSchema,
});

export type GeneratedSkillMap = z.infer<typeof generatedSkillMapSchema>;
export type GenerateSkillMapRequest = z.infer<typeof generateSkillMapRequestSchema>;
export type GenerateSkillMapResponse = z.infer<typeof generateSkillMapResponseSchema>;

export function validateGeneratedSkillMapTree(skillMap: GeneratedSkillMap) {
  const stats = getSkillMapStats(skillMap);

  if (stats.nodeCount > MAX_SKILLMAP_NODES) {
    return {
      success: false as const,
      message: `Generated skill map has too many nodes. Maximum is ${MAX_SKILLMAP_NODES}.`,
    };
  }

  if (stats.maxDepth > MAX_SKILLMAP_DEPTH) {
    return {
      success: false as const,
      message: `Generated skill map is too deep. Maximum depth is ${MAX_SKILLMAP_DEPTH}.`,
    };
  }

  const emptyField = findEmptyRequiredField(skillMap);

  if (emptyField) {
    return {
      success: false as const,
      message: `Generated skill map contains an empty ${emptyField}.`,
    };
  }

  return {
    success: true as const,
    stats,
  };
}

export function getSkillMapStats(skillMap: GeneratedSkillMap) {
  let nodeCount = 0;
  let maxDepth = 0;

  function visit(node: GeneratedSkillMap, depth: number) {
    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);
    node.children.forEach((child) => visit(child, depth + 1));
  }

  visit(skillMap, 1);

  return { nodeCount, maxDepth };
}

function findEmptyRequiredField(node: GeneratedSkillMap): "title" | "description" | null {
  if (!node.title.trim()) {
    return "title";
  }

  if (!node.description.trim()) {
    return "description";
  }

  for (const child of node.children) {
    const emptyField = findEmptyRequiredField(child);

    if (emptyField) {
      return emptyField;
    }
  }

  return null;
}

type JsonSchemaNode = {
  type: "object";
  additionalProperties: false;
  required: ["title", "description", "tags", "children"];
  properties: {
    title: {
      type: "string";
      minLength: 1;
      maxLength: 50;
    };
    description: {
      type: "string";
      minLength: 1;
      maxLength: 500;
    };
    tags: {
      type: "array";
      maxItems: 5;
      items: {
        type: "string";
        minLength: 1;
        maxLength: 30;
      };
    };
    children: {
      type: "array";
      maxItems?: 0;
      items?: JsonSchemaNode;
    };
  };
};

function createJsonSchemaNode(depth: number): JsonSchemaNode {
  const children =
    depth >= MAX_SKILLMAP_DEPTH
      ? {
          type: "array" as const,
          maxItems: 0 as const,
        }
      : {
          type: "array" as const,
          items: createJsonSchemaNode(depth + 1),
        };

  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "description", "tags", "children"],
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: 50,
      },
      description: {
        type: "string",
        minLength: 1,
        maxLength: 500,
      },
      tags: {
        type: "array",
        maxItems: 5,
        items: {
          type: "string",
          minLength: 1,
          maxLength: 30,
        },
      },
      children,
    },
  };
}

export const generatedSkillMapJsonSchema = createJsonSchemaNode(1);
