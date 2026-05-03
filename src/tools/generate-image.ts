import { z } from "zod";
import { IMAGE_PRESETS } from "../presets.js";
import { generateImage } from "../client.js";

export const generateImageSchema = z.object({
  prompt: z.string().describe("Description of the image to generate"),
  preset: z
    .enum(["feed-square", "feed-portrait", "feed-landscape", "story", "cover"])
    .default("feed-square")
    .describe("Facebook content preset determining aspect ratio"),
  model: z
    .enum(["flux-kontext-pro", "ideogram-v3", "seedream-v4"])
    .default("flux-kontext-pro")
    .describe("AI model to use for generation"),
  negative_prompt: z.string().optional().describe("Elements to exclude from the image"),
  style: z.string().optional().describe("Style modifier (e.g. photorealistic, anime, digital-art)"),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export async function handleGenerateImage(input: GenerateImageInput) {
  const preset = IMAGE_PRESETS[input.preset];
  const result = await generateImage({
    prompt: input.prompt,
    aspectRatio: preset.aspectRatio,
    model: input.model,
    negativePrompt: input.negative_prompt,
    style: input.style,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: [
          `Image generated successfully!`,
          ``,
          `**Preset:** ${input.preset} (${preset.aspectRatio}, ${preset.width}x${preset.height})`,
          `**Model:** ${input.model}`,
          `**Task ID:** ${result.taskId}`,
          `**Image URL:** ${result.url}`,
          ``,
          `Ready to use for Facebook ${preset.description}.`,
        ].join("\n"),
      },
    ],
  };
}
