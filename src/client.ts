const BASE_URL = process.env.KIE_AI_BASE_URL || "https://api.kie.ai/api/v1";
const API_KEY = process.env.KIE_AI_API_KEY || "";

interface TaskResult {
  url: string;
  taskId: string;
}

async function request(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kie.ai API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function pollTask(taskId: string, endpoint: string, timeoutMs: number): Promise<string> {
  const start = Date.now();
  const interval = 5000;

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, interval));

    const res = await fetch(`${BASE_URL}${endpoint}?taskId=${taskId}`, {
      headers: { "Authorization": `Bearer ${API_KEY}` },
    });
    if (!res.ok) continue;

    const data = await res.json() as Record<string, unknown>;

    // Flux Kontext format
    if ("successFlag" in data) {
      const flag = data.successFlag as number;
      if (flag === 1) {
        const response = data.response as Record<string, string>;
        return response.resultImageUrl;
      }
      if (flag === 2 || flag === 3) {
        throw new Error(`Task failed: ${(data as Record<string, string>).errorMessage || "unknown error"}`);
      }
      continue;
    }

    // Standard format
    const state = (data as Record<string, string>).state;
    if (state === "success") {
      const resultJson = JSON.parse((data as Record<string, string>).resultJson);
      const urls = resultJson.resultUrls as string[];
      if (urls && urls.length > 0) return urls[0];
    }
    if (state === "fail") {
      throw new Error(`Task failed: ${(data as Record<string, string>).failMsg || "unknown error"}`);
    }
  }

  throw new Error(`Task ${taskId} timed out after ${timeoutMs / 1000}s`);
}

export async function generateImage(params: {
  prompt: string;
  aspectRatio: string;
  model: string;
  negativePrompt?: string;
  style?: string;
}): Promise<TaskResult> {
  let path: string;
  let body: Record<string, unknown>;
  let pollEndpoint: string;

  if (params.model === "flux-kontext-pro") {
    path = "/flux/kontext/generate";
    pollEndpoint = "/flux/kontext/record-info";
    body = {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      model: "flux-kontext-pro",
    };
  } else if (params.model === "ideogram-v3") {
    path = "/jobs/createTask";
    pollEndpoint = "/jobs/recordInfo";
    body = {
      model: "ideogram/v3-text-to-image",
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "",
        aspect_ratio: params.aspectRatio,
        style: params.style || "photorealistic",
      },
    };
  } else {
    path = "/jobs/createTask";
    pollEndpoint = "/jobs/recordInfo";
    body = {
      model: "seedream/seedream-v4-text-to-image",
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "",
        width: 1024,
        height: 1024,
      },
    };
  }

  const result = await request(path, body);

  let taskId: string;
  if (result.data && typeof result.data === "object" && "taskId" in (result.data as Record<string, unknown>)) {
    taskId = (result.data as Record<string, string>).taskId;
  } else if ("taskId" in result) {
    taskId = result.taskId as string;
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(result)}`);
  }

  const url = await pollTask(taskId, pollEndpoint, 120000);
  return { url, taskId };
}

export async function generateVideo(params: {
  prompt: string;
  aspectRatio: string;
  resolution: string;
  model: string;
  imageUrl?: string;
  duration: number;
}): Promise<TaskResult> {
  let path: string;
  let body: Record<string, unknown>;
  let pollEndpoint: string;

  if (params.model === "veo3") {
    path = "/veo/generate";
    pollEndpoint = "/veo/record-info";
    body = {
      prompt: params.prompt,
      model: "veo3",
      aspectRatio: params.aspectRatio,
      ...(params.imageUrl ? { imageUrls: [params.imageUrl] } : {}),
    };
  } else if (params.model === "runway") {
    path = "/runway/generate";
    pollEndpoint = "/jobs/recordInfo";
    body = {
      prompt: params.prompt,
      duration: params.duration,
      quality: params.resolution,
      aspectRatio: params.aspectRatio,
    };
  } else {
    // seedance-lite or seedance-pro
    const quality = params.model === "seedance-pro" ? "pro" : "lite";
    path = "/jobs/createTask";
    pollEndpoint = "/jobs/recordInfo";
    body = {
      model: `bytedance/v1-${quality}-${params.imageUrl ? "image" : "text"}-to-video`,
      input: {
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio,
        resolution: params.resolution,
        duration: String(params.duration),
        ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
      },
    };
  }

  const result = await request(path, body);

  let taskId: string;
  if (result.data && typeof result.data === "object" && "taskId" in (result.data as Record<string, unknown>)) {
    taskId = (result.data as Record<string, string>).taskId;
  } else if ("taskId" in result) {
    taskId = result.taskId as string;
  } else {
    throw new Error(`Unexpected response: ${JSON.stringify(result)}`);
  }

  const url = await pollTask(taskId, pollEndpoint, 300000);
  return { url, taskId };
}
