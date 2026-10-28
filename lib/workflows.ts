import type { AiAgent, AgentTask } from "@/types/database";

export type WorkflowStepMode = "text" | "voice" | "music" | "note";

export type WorkflowStep = {
  id: string;
  title: string;
  mode: WorkflowStepMode;
  instruction: string;
};

export type WorkflowStepState = {
  stepId: string;
  status: "pending" | "running" | "done" | "failed";
  output?: string;
  mediaJobId?: string;
  error?: string;
  feedback?: string;
  finishedAt?: string;
};

type StepSeed = [title: string, mode: WorkflowStepMode, instruction: string];

function build(steps: StepSeed[]): WorkflowStep[] {
  return steps.map(([title, mode, instruction], index) => ({
    id: `s${index + 1}`,
    title,
    mode,
    instruction,
  }));
}

const SCRIPT = build([
  ["Ý tưởng & hook", "text", "Đề xuất 3 góc tiếp cận và chọn 1 hook 3 giây mạnh nhất. Nêu lý do chọn."],
  ["Dàn ý phân đoạn", "text", "Chia video thành các phân đoạn theo timecode, mỗi đoạn ghi mục tiêu và nội dung chính."],
  ["Viết lời thoại", "text", "Viết lời thoại đầy đủ cho từng phân đoạn, giọng tự nhiên, câu ngắn dễ đọc."],
  ["CTA & thumbnail", "text", "Viết CTA cuối video và 3 phương án thumbnail (mô tả hình + chữ trên ảnh)."],
  ["Tự kiểm tra", "text", "Rà lại toàn bộ: hook, mạch lạc, thời lượng, CTA. Liệt kê lỗi cần sửa nếu có."],
]);

const VIDEO = build([
  ["Concept & hook", "text", "Chốt concept video, thông điệp chính và hook 3 giây. Nêu đối tượng và nền tảng đăng."],
  ["Kịch bản phân cảnh", "text", "Chia video thành các cảnh có timecode, mỗi cảnh gồm lời thoại và mô tả hình ảnh."],
  ["Danh sách ảnh & prompt", "text", "Liệt kê ảnh/B-roll cần cho từng cảnh, kèm prompt tạo ảnh bằng AI (tiếng Anh) nếu cần."],
  ["Chuẩn hoá voice-over", "text", "Chuẩn hoá lời đọc: câu ngắn, ngắt nghỉ, cảm xúc từng đoạn để đưa sang VieNeu-TTS."],
  ["Voice-over (VieNeu)", "voice", "Đưa toàn bộ lời đọc đã chuẩn hoá vào hàng đợi tổng hợp giọng nói."],
  ["Nhạc nền (ACE-Step)", "music", "Mô tả nhạc nền phù hợp rồi đưa vào hàng đợi tạo nhạc."],
  ["Checklist dựng & đăng", "note", "Tổng hợp checklist dựng video (thứ tự cảnh, phụ đề, tỉ lệ khung hình) và thông tin đăng bài."],
]);

const VOICE = build([
  ["Chuẩn hoá lời đọc", "text", "Sửa lời đọc cho tự nhiên khi nói: câu ngắn, bỏ từ khó đọc, đánh dấu ngắt nghỉ."],
  ["Chia đoạn & cảm xúc", "text", "Chia thành các đoạn 1-2 câu, ghi chú cảm xúc/tốc độ cho từng đoạn."],
  ["Render giọng (VieNeu)", "voice", "Đưa lời đọc hoàn chỉnh vào hàng đợi tổng hợp giọng tiếng Việt."],
]);

const MUSIC = build([
  ["Brief nhạc", "text", "Xác định thể loại, nhạc cụ, cảm xúc, BPM và thời lượng phù hợp nội dung."],
  ["Prompt ACE-Step", "text", "Viết 3 prompt tiếng Anh cho ACE-Step, chọn 1 prompt tốt nhất và giải thích."],
  ["Render nhạc (ACE-Step)", "music", "Đưa prompt đã chọn vào hàng đợi tạo nhạc."],
]);

const SEO = build([
  ["Từ khoá & search intent", "text", "Xác định 1 từ khoá chính, 5 từ khoá phụ và search intent. Nêu đối thủ mạnh nhất."],
  ["Tiêu đề + meta", "text", "Viết 3 tiêu đề (≤ 60 ký tự) và meta description (≤ 155 ký tự) cho từng tiêu đề."],
  ["Dàn H2/H3", "text", "Lập dàn ý H2/H3 logic, mỗi mục ghi ý chính và từ khoá cần có."],
  ["Viết bài", "text", "Viết bài hoàn chỉnh 800-1200 từ theo dàn ý, chèn CTA tự nhiên."],
  ["On-page check", "text", "Kiểm tra mật độ từ khoá, internal link, tiêu đề, meta và CTA. Kết luận đạt/chưa đạt."],
]);

const BOOK = build([
  ["Dàn ý chương", "text", "Lập dàn ý chi tiết cho chương: mục tiêu, 3 ý chính, ví dụ, kết chương."],
  ["Viết bản nháp", "text", "Viết bản nháp chương theo dàn ý, văn phong mạch lạc, có ví dụ thực tế."],
  ["Biên tập", "text", "Biên tập lại: sửa lặp ý, câu dài, lỗi logic; giữ nguyên giọng tác giả."],
  ["Kiểm tra nhất quán", "text", "Kiểm tra thuật ngữ, dữ kiện, mạch liên kết với các chương khác. Kết luận."],
]);

const RESEARCH = build([
  ["Quét thị trường", "text", "Liệt kê 7-10 cơ hội/chủ đề tiềm năng, kèm lý do và mức độ cạnh tranh."],
  ["Shortlist", "text", "Chọn ra 3 lựa chọn tốt nhất, lập bảng so sánh ưu/nhược điểm."],
  ["Phân tích đối thủ", "text", "Phân tích 3 đối thủ: cách làm, điểm mạnh, điểm yếu, khoảng trống."],
  ["Brief hành động", "text", "Viết brief hành động cụ thể cho bước tiếp theo, kèm chỉ số đo."],
]);

const QA = build([
  ["Checklist kiểm tra", "text", "Lập checklist kiểm tra phù hợp nội dung (hook, cấu trúc, chính xác, CTA, chính sách nền tảng)."],
  ["Phát hiện lỗi", "text", "Rà nội dung theo checklist, liệt kê lỗi theo mức ưu tiên và vị trí."],
  ["Đề xuất sửa", "text", "Đề xuất cách sửa cụ thể cho từng lỗi."],
  ["Kết luận", "text", "Kết luận ĐẠT hoặc KHÔNG ĐẠT. Nếu không đạt, nêu điều kiện để đạt."],
]);

const CAPTION = build([
  ["Hook", "text", "Viết 3 câu mở đầu gây tò mò, chọn 1 câu tốt nhất."],
  ["Caption chính", "text", "Viết caption dưới 150 từ, giữ chân người đọc, có CTA."],
  ["Biến thể A/B", "text", "Viết 2 biến thể caption khác để A/B test."],
  ["Hashtag & giờ đăng", "text", "Đề xuất 15 hashtag (lớn + ngách) và khung giờ đăng tốt nhất."],
]);

const STRATEGY = build([
  ["Đánh giá mục tiêu", "text", "Đánh giá mục tiêu hiện tại, nêu 3 cơ hội và 3 rủi ro lớn nhất."],
  ["Lập kế hoạch", "text", "Lập kế hoạch 7 ngày: mục tiêu, việc cần làm, người phụ trách, chỉ số đo."],
  ["Phân rã giao việc", "text", "Phân rã thành các đầu việc cụ thể cho từng phòng ban."],
  ["Điểm rủi ro", "text", "Đánh giá rủi ro thực thi và đề xuất cách giảm thiểu."],
]);

const MANAGE = build([
  ["Bối cảnh & mục tiêu", "text", "Tóm tắt bối cảnh, mục tiêu và tiêu chí thành công của việc được giao."],
  ["Brief cho nhân viên", "text", "Viết brief chi tiết để giao cho nhân viên thực thi, kèm định dạng đầu ra."],
  ["Tiêu chí nghiệm thu", "text", "Đặt tiêu chí nghiệm thu rõ ràng (đạt/không đạt) cho đầu ra."],
  ["Báo cáo", "text", "Viết báo cáo ngắn: kế hoạch, phân công, rủi ro, đề xuất."],
]);

const GENERAL = build([
  ["Hiểu yêu cầu", "text", "Tóm tắt yêu cầu, xác định đầu ra cần bàn giao và tiêu chí thành công."],
  ["Draft", "text", "Tạo bản nháp đầu tiên đúng định dạng yêu cầu."],
  ["Tinh chỉnh", "text", "Rà và cải thiện bản nháp: rõ ràng, cụ thể, có ví dụ."],
  ["Tự kiểm tra", "text", "Tự kiểm tra theo tiêu chí, liệt kê điểm cần sửa và bản hoàn chỉnh."],
]);

const SIMPLE = build([
  ["Thực hiện", "text", "Thực hiện yêu cầu, trả về kết quả đúng định dạng."],
  ["Tự kiểm tra", "text", "Kiểm tra lại kết quả, sửa lỗi nếu có và trả về bản cuối."],
]);

export function workflowForAgent(
  agent: Pick<AiAgent, "role" | "title" | "name">
): WorkflowStep[] {
  const text = `${agent.title ?? ""} ${agent.name ?? ""}`.toLowerCase();

  if (agent.role === "ceo" || agent.role === "super_admin") return STRATEGY;
  if (agent.role === "manager") return MANAGE;

  if (/(dựng video|video|editor|media)/.test(text)) return VIDEO;
  if (/(voice|giọng|thuyết minh)/.test(text)) return VOICE;
  if (/(nhạc|music)/.test(text)) return MUSIC;
  if (/(seo|từ khoá|keyword)/.test(text)) return SEO;
  if (/(kịch bản|script)/.test(text)) return SCRIPT;
  if (/(review|qa|kiểm|duyệt)/.test(text)) return QA;
  if (/(sách|chương|biên tập|dàn ý|xuất bản)/.test(text)) return BOOK;
  if (/(nghiên cứu|research|hunter|analyst|phân tích)/.test(text)) {
    return RESEARCH;
  }
  if (/(caption|hashtag)/.test(text)) return CAPTION;

  return agent.role === "worker" ? SIMPLE : GENERAL;
}

export function stepsForAgent(agent: AiAgent): WorkflowStep[] {
  const stored = Array.isArray(agent.workflow)
    ? (agent.workflow as unknown as WorkflowStep[])
    : [];
  return stored.length > 0 ? stored : workflowForAgent(agent);
}

export function initialStepStates(steps: WorkflowStep[]): WorkflowStepState[] {
  return steps.map((step) => ({ stepId: step.id, status: "pending" }));
}

export function parseStepStates(task: AgentTask): WorkflowStepState[] {
  return Array.isArray(task.workflow_state)
    ? (task.workflow_state as unknown as WorkflowStepState[])
    : [];
}

export function nextPendingStep(
  steps: WorkflowStep[],
  states: WorkflowStepState[]
): { step: WorkflowStep; index: number } | null {
  for (let index = 0; index < steps.length; index += 1) {
    const state =
      states.find((entry) => entry.stepId === steps[index].id) ??
      states[index];
    if (!state || state.status !== "done") {
      return { step: steps[index], index };
    }
  }
  return null;
}

export function combineStepOutputs(
  steps: WorkflowStep[],
  states: WorkflowStepState[]
): string {
  return steps
    .map((step) => {
      const state =
        states.find((entry) => entry.stepId === step.id) ??
        states[steps.indexOf(step)];
      if (!state?.output) return null;
      return `## ${step.title}\n${state.output}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 30_000);
}
