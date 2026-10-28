// Seed 7 prompt content marketing vào Thư viện tri thức (dùng chung).
// Chạy một lần:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SEED_EMAIL=... SEED_PASSWORD=... \
//   node --experimental-strip-types scripts/seed-knowledge-prompts.mjs

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.error(
    "Thiếu env SUPABASE_URL, SUPABASE_ANON_KEY, SEED_EMAIL, SEED_PASSWORD"
  );
  process.exit(1);
}

const PROMPTS = [
  {
    title: "Prompt 1 · Phân tích & xác định công thức content",
    pinned: true,
    content: `"Đây là 10 bài viết Facebook có tương tác cao nhất của tôi trong 3 tháng qua: [dán nội dung vào]
Hãy phân tích và tìm ra:
(1) Công thức câu mở đầu nào xuất hiện nhiều nhất trong các bài viral?
(2) Chủ đề nào nhận được nhiều comment và share nhất — và tại sao?
(3) Độ dài bài viết nào hoạt động tốt nhất với tệp khán giả của tôi?
Đừng tóm tắt, hãy tìm pattern ẩn phía sau.
Kết thúc bằng 1 công thức content tôi có thể lặp lại mỗi ngày."

Mục đích: hiểu đúng công thức đang hiệu quả trước khi tạo nội dung mới.`,
  },
  {
    title: "Prompt 2 · Tạo lịch content 30 ngày",
    pinned: false,
    content: `"Tôi làm content về [chủ đề của bạn] nhắm đến [mô tả tệp khán giả].
Hãy lập lịch content Facebook 30 ngày với cấu trúc mỗi tuần:
- 2 bài giáo dục (dạy một điều cụ thể có thể áp dụng ngay)
- 2 bài viral (hook mạnh, kéo share và comment)
- 1 bài cá nhân (câu chuyện thật, tạo kết nối cảm xúc)
- 1 bài seeding (dẫn dắt tự nhiên về sản phẩm/dịch vụ)
- 1 bài tương tác (câu hỏi, poll, debate)
Với mỗi bài: ghi rõ chủ đề + góc tiếp cận + dạng hook sẽ dùng.
Ưu tiên chủ đề đang hot trong ngành [lĩnh vực của bạn] tháng này."

Mục đích: có lịch rõ ràng, không còn hỏi "hôm nay đăng gì".`,
  },
  {
    title: "Prompt 3 · Viết bài viral theo công thức",
    pinned: false,
    content: `"Viết cho tôi một bài Facebook theo đúng cấu trúc sau:
Câu mở đầu: gây shock hoặc tạo tò mò ngay lập tức - không quá 15 chữ
Đoạn 2: đánh vào đúng nỗi đau hoặc mong muốn của [mô tả khán giả]
Đoạn 3–5: nội dung chính — mỗi đoạn 1 ý, ngắn, có ví dụ thực tế
Đoạn cuối: CTA tự nhiên — không ép buộc, không lộ liễu
Chủ đề: [điền chủ đề]
Tone: [casual / chuyên nghiệp / truyền cảm hứng]
Độ dài: 150–250 chữ
Viết 3 phiên bản khác nhau - tôi sẽ chọn 1 để đăng."

Mục đích: luôn có 3 phương án để chọn bản mạnh nhất.`,
  },
  {
    title: "Prompt 4 · Tạo kho 30 hook mạnh",
    pinned: true,
    content: `"Tôi làm content về [chủ đề] cho tệp [mô tả khán giả].
Tạo cho tôi 30 câu mở đầu bài Facebook, mỗi câu theo 1 cơ chế tâm lý khác nhau:
- Gây shock bằng con số
- Phá vỡ niềm tin sai
- Kể chuyện bắt đầu bằng tình huống cụ thể
- Đặt câu hỏi khiến người đọc tự thấy mình trong đó
- Cảnh báo về sai lầm đang mắc phải
Với mỗi hook: ghi rõ đang dùng cơ chế tâm lý nào và phù hợp nhất cho loại bài nào.
Tôi muốn dùng kho này trong 3 tháng tới."

Mục đích: có kho hook sẵn, không mất 30 phút nghĩ câu mở đầu.`,
  },
  {
    title: "Prompt 5 · Biến 1 ý tưởng thành 7 bài khác nhau",
    pinned: false,
    content: `"Tôi có 1 ý tưởng content sau: [mô tả ý tưởng]
Hãy biến nó thành 7 bài Facebook hoàn toàn khác nhau về góc tiếp cận:
(1) Góc cảnh báo — ai đang mắc sai lầm này
(2) Góc case study — câu chuyện người thật việc thật
(3) Góc so sánh — trước và sau khi biết điều này
(4) Góc hướng dẫn — các bước cụ thể
(5) Góc phản biện — quan điểm trái chiều gây tranh luận
(6) Góc cảm xúc — chạm vào nỗi sợ hoặc mong muốn sâu nhất
(7) Góc listicle — danh sách con số cụ thể
Mỗi bài viết đủ hoàn chỉnh — sẵn sàng đăng luôn."

Mục đích: 1 ý tưởng = 7 bài = cả tuần không cần nghĩ thêm.`,
  },
  {
    title: "Prompt 6 · Tối ưu bài đăng hiệu quả thấp",
    pinned: false,
    content: `"Đây là bài Facebook tôi đã đăng nhưng tương tác thấp hơn kỳ vọng: [dán bài vào]
Hãy phân tích và chỉ ra:
(1) Câu mở đầu đang mắc lỗi gì khiến người đọc không dừng lại?
(2) Phần nào trong bài đang làm người đọc mất hứng và thoát ra?
(3) CTA đang yếu ở điểm nào?
Sau đó viết lại bài này hoàn chỉnh — giữ nguyên thông điệp gốc nhưng mạnh hơn ở tất cả các điểm trên.
Giải thích rõ tại sao từng thay đổi lại hiệu quả hơn."

Mục đích: không bỏ bài cũ, tái chế thành bài mới mạnh hơn.`,
  },
  {
    title: "Prompt 7 · Phân tích & nhân bản bài viral",
    pinned: false,
    content: `"Bài Facebook này của tôi vừa đạt [số view/share/comment]: [dán bài vào]
Hãy mổ xẻ chính xác:
(1) Yếu tố nào trong câu mở đầu khiến người đọc dừng lại?
(2) Điểm nào trong bài tạo ra cảm xúc mạnh nhất — và cảm xúc đó là gì?
(3) Tại sao người đọc lại muốn share bài này?
Sau khi phân tích xong:
Tạo cho tôi 5 bài mới áp dụng đúng công thức của bài viral này — khác chủ đề nhưng giữ nguyên cấu trúc tâm lý đã khiến bài gốc thành công."

Mục đích: hiểu bài viral và nhân bản liên tục.`,
  },
];

async function login() {
  const response = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(`Login lỗi: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  const token = await login();
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const meRes = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  });
  const me = await meRes.json();

  const existingRes = await fetch(
    `${URL}/rest/v1/knowledge_docs?select=title&owner_id=eq.${me.id}`,
    { headers }
  );
  const existing = await existingRes.json();
  const titles = new Set(existing.map((doc) => doc.title));

  for (const prompt of PROMPTS) {
    if (titles.has(prompt.title)) {
      console.log(`- đã có: ${prompt.title}`);
      continue;
    }
    const response = await fetch(`${URL}/rest/v1/knowledge_docs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        owner_id: me.id,
        title: prompt.title,
        category: "prompt",
        domain: "Content Facebook",
        content: prompt.content,
        tags: ["facebook", "content-marketing", "viral"],
        active: true,
        pinned: prompt.pinned,
      }),
    });
    console.log(
      response.ok
        ? `+ ${prompt.title}`
        : `- lỗi ${response.status}: ${(await response.text()).slice(0, 160)}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
