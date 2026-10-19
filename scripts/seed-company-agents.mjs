// Seed nhân sự AI cho các công ty còn trống, dùng đúng template trong
// lib/company-templates.ts. Chạy một lần:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SEED_EMAIL=... SEED_PASSWORD=... \
//   node --experimental-strip-types scripts/seed-company-agents.mjs

import { COMPANY_TEMPLATES } from "../lib/company-templates.ts";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!URL || !KEY || !EMAIL || !PASSWORD) {
  console.error(
    "Thiếu env: SUPABASE_URL, SUPABASE_ANON_KEY, SEED_EMAIL, SEED_PASSWORD"
  );
  process.exit(1);
}

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

async function main() {
  const token = await login();

  const companiesRes = await api(token, "companies?select=id,name,vertical");
  const companies = await companiesRes.json();

  for (const company of companies) {
    const template = COMPANY_TEMPLATES[company.vertical];
    if (!template) {
      console.log(`- ${company.name}: không có template (${company.vertical}), bỏ qua`);
      continue;
    }

    const countRes = await api(
      token,
      `ai_agents?company_id=eq.${company.id}&select=id`
    );
    const existing = await countRes.json();
    if (existing.length > 0) {
      console.log(`- ${company.name}: đã có ${existing.length} AI, bỏ qua`);
      continue;
    }

    console.log(`- ${company.name}: đang tạo nhân sự…`);

    const ceoRes = await api(token, "ai_agents", {
      method: "POST",
      body: JSON.stringify({
        company_id: company.id,
        name: template.ceo.name,
        role: template.ceo.role,
        title: template.ceo.title,
        system_prompt: template.ceo.systemPrompt,
        max_tokens_per_run: template.ceo.maxTokensPerRun ?? 4000,
      }),
    });
    const [ceo] = await ceoRes.json();

    let created = 1;
    for (const department of template.departments) {
      const managerRes = await api(token, "ai_agents", {
        method: "POST",
        body: JSON.stringify({
          company_id: company.id,
          parent_id: ceo.id,
          name: department.manager.name,
          role: department.manager.role,
          title: department.manager.title,
          system_prompt: department.manager.systemPrompt,
          max_tokens_per_run: department.manager.maxTokensPerRun ?? 4000,
        }),
      });
      const [manager] = await managerRes.json();
      created += 1;

      for (const worker of department.workers) {
        await api(token, "ai_agents", {
          method: "POST",
          body: JSON.stringify({
            company_id: company.id,
            parent_id: manager.id,
            name: worker.name,
            role: worker.role,
            title: worker.title,
            system_prompt: worker.systemPrompt,
            max_tokens_per_run: worker.maxTokensPerRun ?? 4000,
          }),
        });
        created += 1;
      }
    }

    console.log(`  → đã tạo ${created} AI cho ${company.name}`);
  }

  console.log("Xong.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
