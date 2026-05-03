#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { generateImageSchema, handleGenerateImage } from "./tools/generate-image.js";
import { generateVideoSchema, handleGenerateVideo } from "./tools/generate-video.js";
import { IMAGE_PRESETS, VIDEO_PRESETS } from "./presets.js";
import { zodToJsonSchema } from "./zod-to-json.js";

if (!process.env.KIE_AI_API_KEY) {
  console.error("Error: KIE_AI_API_KEY environment variable is required");
  process.exit(1);
}

const server = new Server(
  { name: "kie-ai-facebook", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "facebook_image",
      description: `Generate an image optimized for Facebook. Presets: ${Object.entries(IMAGE_PRESETS)
        .map(([k, v]) => `${k} (${v.aspectRatio} - ${v.description})`)
        .join(", ")}`,
      inputSchema: zodToJsonSchema(generateImageSchema),
    },
    {
      name: "facebook_video",
      description: `Generate a video optimized for Facebook. Presets: ${Object.entries(VIDEO_PRESETS)
        .map(([k, v]) => `${k} (${v.aspectRatio} - ${v.description})`)
        .join(", ")}`,
      inputSchema: zodToJsonSchema(generateVideoSchema),
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "facebook_image": {
        const input = generateImageSchema.parse(args);
        return await handleGenerateImage(input);
      }
      case "facebook_video": {
        const input = generateVideoSchema.parse(args);
        return await handleGenerateVideo(input);
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
