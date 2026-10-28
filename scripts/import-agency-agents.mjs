// Import agent prompts từ https://github.com/msitarzewski/agency-agents (MIT)
// Chạy một lần:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SEED_EMAIL=... SEED_PASSWORD=... \
//   node --experimental-strip-types scripts/import-agency-agents.mjs
//
// Script tải file .md đã chọn, nén lấy phần chuyên môn + workflow,
// rồi tạo agent trong DB (đúng công ty, dưới đúng manager).

import { workflowForAgent } from "../lib/workflows.ts";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

const RAW_BASE =
  "https://raw.githubusercontent.com/msitarzewski/agency-agents/main";

if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.error("Thiếu env SUPABASE_URL, SUPABASE_ANON_KEY, SEED_EMAIL, SEED_PASSWORD");
  process.exit(1);
}

const IMPORTS = [
  // ===== VIC Affiliate =====
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-tiktok-strategist.md",
    parent: "Manager Content",
    title: "Chuyên viên TikTok",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-content-creator.md",
    parent: "Manager Content",
    title: "Chuyên viên sáng tạo nội dung",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-seo-specialist.md",
    parent: "Manager Content",
    title: "Chuyên viên SEO",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-social-media-strategist.md",
    parent: "Manager Growth",
    title: "Chiến lược gia mạng xã hội",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-multi-platform-publisher.md",
    parent: "Manager Growth",
    title: "Chuyên viên đăng đa nền tảng",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-video-optimization-specialist.md",
    parent: "Manager Content",
    title: "Chuyên viên tối ưu video",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-livestream-commerce-coach.md",
    parent: "Manager Growth",
    title: "Coach livestream bán hàng",
  },
  {
    company: "VIC Affiliate",
    file: "marketing/marketing-cross-border-ecommerce.md",
    parent: "Manager Growth",
    title: "Chuyên viên TMĐT xuyên biên giới",
  },
  // ===== VIC Media =====
  {
    company: "VIC Media",
    file: "marketing/marketing-short-video-editing-coach.md",
    parent: "Manager Production",
    title: "Coach dựng video ngắn",
  },
  {
    company: "VIC Media",
    file: "marketing/marketing-podcast-strategist.md",
    parent: "Manager Distribution",
    title: "Chiến lược gia podcast",
  },
  // ===== VIC Publishing =====
  {
    company: "VIC Publishing",
    file: "marketing/marketing-book-co-author.md",
    parent: "Manager Biên tập",
    title: "Đồng tác giả sách",
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

function api(token, path, init = {}) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const header = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);
  const meta = {};
  for (const line of header.split("\n")) {
    const match = /^([a-zA-Z_]+):\s*(.+)$/.exec(line.trim());
    if (match) meta[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return { meta, body };
}

function section(body, heading) {
  const pattern = new RegExp(
    `##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  );
  const match = pattern.exec(body);
  return match ? match[1].trim() : "";
}

function condense(body) {
  const parts = [
    section(body, "Identity & Memory"),
    section(body, "Core Mission"),
    section(body, "Critical Rules"),
    section(body, "Technical Deliverables"),
    section(body, "Workflow Process"),
    section(body, "Success Metrics"),
    section(body, "Communication Style"),
  ].filter(Boolean);

  const text = parts.join("\n\n");
  return (text || body).slice(0, 7500);
}

function phasesToWorkflow(workflowText) {
  const phases = [];
  const pattern = /###\s+(?:Phase\s+\d+[:.]?\s*)?(.+)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g;
  let match;
  while ((match = pattern.exec(workflowText)) !== null) {
    const title = match[1].trim().replace(/\*\*/g, "");
    const detail = match[2]
      .replace(/^\s*\d+\.\s*/gm, "")
      .replace(/\*\*/g, "")
      .trim();
    if (!title) continue;
    phases.push({ title, detail: detail.slice(0, 320) });
    if (phases.length >= 6) break;
  }
  return phases.map((phase, index) => ({
    id: `s${index + 1}`,
    title: phase.title,
    mode: "text",
    instruction: `${phase.detail}\n\nHoàn thành bước này đầy đủ theo chuyên môn của bạn, trả về kết quả cụ thể.`,
  }));
}

async function main() {
  const token = await login();

  const companiesRes = await api(token, "companies?select=id,name");
  const companies = await companiesRes.json();
  const agentsRes = await api(
    token,
    "ai_agents?select=id,name,company_id,role"
  );
  const existingAgents = await agentsRes.json();

  for (const item of IMPORTS) {
    const company = companies.find((entry) => entry.name === item.company);
    if (!company) {
      console.log(`- ${item.company}: không tìm thấy, bỏ qua ${item.file}`);
      continue;
    }

    const raw = await fetch(`${RAW_BASE}/${item.file}`).then((res) =>
      res.text()
    );
    const { meta, body } = parseFrontmatter(raw);
    const name = meta.name || item.file.split("/").pop().replace(".md", "");

    const duplicate = existingAgents.find(
      (agent) => agent.company_id === company.id && agent.name === name
    );
    if (duplicate) {
      console.log(`- ${item.company}: đã có "${name}", bỏ qua`);
      continue;
    }

    const parent = existingAgents.find(
      (agent) => agent.company_id === company.id && agent.name === item.parent
    );
    const ceo = existingAgents.find(
      (agent) =>
        agent.company_id === company.id && agent.role === "ceo"
    );

    const workflowText = section(body, "Workflow Process");
    const derived = workflowText ? phasesToWorkflow(workflowText) : [];
    const workflow =
      derived.length >= 2
        ? derived
        : workflowForAgent({ role: "specialist", title: item.title, name });

    const systemPrompt = `${condense(body)}

[NGUYÊN TẮC VẬN HÀNH]
- Luôn trả lời bằng tiếng Việt.
- Chỉ làm trong phạm vi chuyên môn; nêu rõ giả định khi thiếu dữ liệu.
- Mọi đầu ra sẽ được con người duyệt trước khi phát hành; không tự thực hiện hành động nhạy cảm.
- Nguồn chuyên môn: ${RAW_BASE}/${item.file} (giấy phép MIT, tác giả msitarzewski/agency-agents).`;

    const response = await api(token, "ai_agents", {
      method: "POST",
      body: JSON.stringify({
        company_id: company.id,
        parent_id: parent?.id ?? ceo?.id ?? null,
        name,
        role: "specialist",
        title: item.title,
        system_prompt: systemPrompt,
        max_tokens_per_run: 5000,
        workflow,
        metadata: {
          source_url: `${RAW_BASE}/${item.file}`,
          license: "MIT",
          imported_from: "msitarzewski/agency-agents",
        },
      }),
    });

    if (!response.ok) {
      console.log(
        `- ${item.company} / ${name}: lỗi ${response.status} ${(await response.text()).slice(0, 200)}`
      );
      continue;
    }

    const [agent] = await response.json();
    console.log(
      `+ ${item.company}: ${name} (${item.title}) · ${workflow.length} bước`
    );
    existingAgents.push({
      id: agent.id,
      name: agent.name,
      company_id: company.id,
      role: agent.role,
    });
  }

  console.log("Xong.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
