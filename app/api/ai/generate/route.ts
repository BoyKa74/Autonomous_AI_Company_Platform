import type { NextRequest } from "next/server";
import { getApiSession, jsonError } from "@/lib/api";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { AiRouterError, generate } from "@/lib/ai/router";
import { aiGenerateSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const { supabase, user } = await getApiSession();
  if (!user) return jsonError(401, "Chưa đăng nhập");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Body phải là JSON hợp lệ");
  }

  const parsed = aiGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      422,
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
    );
  }

  const { task, prompt, provider, channelId, tone, audience } = parsed.data;

  let channel = null;
  if (channelId) {
    const { data } = await supabase
      .from("channels")
      .select("name, platform, region, goal")
      .eq("id", channelId)
      .maybeSingle();
    if (!data) return jsonError(404, "Không tìm thấy kênh");
    channel = data;
  }

  const system = buildSystemPrompt(task, { channel, tone, audience });

  try {
    const result = await generate({
      task,
      provider,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    return Response.json({
      text: result.text,
      provider: result.provider,
      model: result.model,
      task: result.task,
      failedAttempts: result.failedAttempts,
    });
  } catch (error) {
    if (error instanceof AiRouterError) {
      return Response.json(
        { error: error.message, failedAttempts: error.failedAttempts },
        { status: 502 }
      );
    }
    return jsonError(500, "Lỗi không xác định khi gọi AI");
  }
}
