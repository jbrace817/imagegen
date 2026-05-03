export interface Preset {
  aspectRatio: string;
  width: number;
  height: number;
  description: string;
}

export const IMAGE_PRESETS: Record<string, Preset> = {
  "feed-square": { aspectRatio: "1:1", width: 1080, height: 1080, description: "Standard feed post" },
  "feed-portrait": { aspectRatio: "4:5", width: 1080, height: 1350, description: "Feed post (max vertical)" },
  "feed-landscape": { aspectRatio: "16:9", width: 1200, height: 628, description: "Link preview / shared post" },
  "story": { aspectRatio: "9:16", width: 1080, height: 1920, description: "Stories & Reels cover" },
  "cover": { aspectRatio: "16:9", width: 820, height: 312, description: "Page cover photo" },
};

export const VIDEO_PRESETS: Record<string, Preset & { resolution: string }> = {
  "video-feed": { aspectRatio: "4:5", width: 1080, height: 1350, resolution: "1080p", description: "Feed video" },
  "video-reel": { aspectRatio: "9:16", width: 1080, height: 1920, resolution: "1080p", description: "Reels / short video" },
  "video-landscape": { aspectRatio: "16:9", width: 1920, height: 1080, resolution: "1080p", description: "Standard landscape video" },
};
