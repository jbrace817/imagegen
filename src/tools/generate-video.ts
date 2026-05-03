import { z } from "zod";
import { VIDEO_PRESETS } from "../presets.js";
import { generateVideo } from "../client.js";

export const generateVideoSchema = z.object({
  prompt: z.string().describe("Description of the video to generate"),
  preset: z
    .enum(["video-feed", "video-reel", "video-landscape"])
    .default("video-reel")
    .describe("Facebook video preset determining aspect ratio and resolution"),
  model: z
    .enum(["veo3", "seedance-lite", "seedance-pro", "runway"])
    .default("veo3")
    .describe("AI model to use for video generation"),
  image_url: z.string().url().optional().describe("Input image URL for image-to-video generation"),
  duration: z
    .union([z.literal(5), z.literal(10)])
    .default(5)
    .describe("Video duration in seconds"),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;

export async function handleGenerateVideo(input: GenerateVideoInput) {
  const preset = VIDEO_PRESETS[input.preset];
  const result = await generateVideo({
    prompt: input.prompt,
    aspectRatio: preset.aspectRatio,
    resolution: preset.resolution,
    model: input.model,
    imageUrl: input.image_url,
    duration: input.duration,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: [
          `Video generated successfully!`,
          ``,
          `**Preset:** ${input.preset} (${preset.aspectRatio}, ${preset.resolution})`,
          `**Model:** ${input.model}`,
          `**Duration:** ${input.duration}s`,
          `**Task ID:** ${result.taskId}`,
          `**Video URL:** ${result.url}`,
          ``,
          `Ready to use for Facebook ${preset.description}.`,
        ].join("\n"),
      },
    ],
  };
}
