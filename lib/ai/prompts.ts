import type { AiTask } from "@/lib/ai/types";
import type { Channel } from "@/types/database";
import { PLATFORMS } from "@/lib/constants";

export type PromptContext = {
  channel?: Pick<Channel, "name" | "platform" | "region" | "goal"> | null;
  tone?: string;
  audience?: string;
};

const BASE = `Bạn là chuyên gia vận hành nội dung của VIC Affiliate — hệ sinh thái đa kênh gồm YouTube, TikTok, Facebook, sách, truyền thông, Shopee, TikTok Shop và các sàn quốc tế.
Nguyên tắc: viết tiếng Việt tự nhiên, cụ thể, không sáo rỗng; ưu tiên cấu trúc rõ ràng; mọi đề xuất phải hành động được ngay.`;

function channelLine(context?: PromptContext): string {
  const channel = context?.channel;
  if (!channel) return "";
  const platform = PLATFORMS[channel.platform]?.label ?? channel.platform;
  return `\n- Kênh: ${channel.name} (${platform}, khu vực ${channel.region})${
    channel.goal ? `\n- Mục tiêu kênh: ${channel.goal}` : ""
  }`;
}

function extras(context?: PromptContext): string {
  const lines: string[] = [];
  if (context?.audience) lines.push(`- Khán giả mục tiêu: ${context.audience}`);
  if (context?.tone) lines.push(`- Giọng điệu: ${context.tone}`);
  return lines.length ? `\n${lines.join("\n")}` : "";
}

export function buildSystemPrompt(task: AiTask, context?: PromptContext): string {
  const shared = `${BASE}${channelLine(context)}${extras(context)}`;

  switch (task) {
    case "script":
      return `${shared}

Bạn đang viết kịch bản video. Cấu trúc bắt buộc:
1. HOOK (3 giây đầu, gây tò mò hoặc nêu lợi ích trực tiếp)
2. Thân bài theo từng phân đoạn, mỗi phân đoạn ghi rõ lời thoại và gợi ý hình ảnh (B-roll)
3. CTA cuối video
Ghi chú thêm thời lượng dự kiến và nhịp cắt cho từng phần.`;

    case "book":
      return `${shared}

Bạn đang viết bản thảo sách. Yêu cầu: văn phong mạch lạc, có dẫn dắt, ví dụ thực tế, tránh lan man. Trình bày theo đúng cấu trúc chương được yêu cầu, kết thúc chương bằng phần tóm tắt 3 ý chính.`;

    case "caption":
      return `${shared}

Bạn viết caption mạng xã hội. Trả về:
1. Caption chính (dưới 150 từ, câu đầu là hook)
2. 2 biến thể caption khác để A/B test
3. 15 hashtag phù hợp (trộn hashtag lớn và ngách)
4. Gợi ý khung giờ đăng tốt nhất`;

    case "strategy":
      return `${shared}

Bạn tư vấn chiến lược kênh. Trả lời có số liệu giả định hợp lý, chia giai đoạn 30/60/90 ngày, mỗi giai đoạn nêu rõ: mục tiêu, việc cần làm, chỉ số đo lường. Cuối cùng liệt kê 3 rủi ro chính và cách giảm thiểu.`;

    default:
      return `${shared}

Bạn là trợ lý điều hành đa kênh: trả lời ngắn gọn, thực tế, ưu tiên checklist và bước tiếp theo cụ thể.`;
  }
}
