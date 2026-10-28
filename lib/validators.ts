import { z } from "zod";

export const channelPlatformSchema = z.enum([
  "youtube",
  "tiktok",
  "facebook",
  "book",
  "media",
  "shopee",
  "tiktok_shop",
  "other",
]);

export const channelStatusSchema = z.enum([
  "active",
  "paused",
  "draft",
  "archived",
]);

export const contentKindSchema = z.enum([
  "video",
  "short",
  "post",
  "article",
  "book_chapter",
  "product_listing",
  "other",
]);

export const contentStatusSchema = z.enum([
  "idea",
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const aiTaskSchema = z.enum([
  "script",
  "book",
  "caption",
  "strategy",
  "general",
]);

export const aiProviderSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "openrouter",
]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự`)
    .optional()
    .transform((value) => (value ? value : null));

export const channelInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nhập tên kênh")
    .max(120, "Tên kênh tối đa 120 ký tự"),
  platform: channelPlatformSchema,
  company_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => value === null || z.string().uuid().safeParse(value).success,
      "Công ty không hợp lệ"
    ),
  handle: optionalText(120),
  url: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => value === null || z.url().safeParse(value).success,
      "Link không hợp lệ"
    ),
  region: z.string().trim().min(1, "Chọn khu vực").max(30),
  status: channelStatusSchema,
  goal: optionalText(300),
  notes: optionalText(2000),
  followers: z.coerce
    .number()
    .int("Số follower phải là số nguyên")
    .min(0, "Không thể âm")
    .max(1_000_000_000, "Số quá lớn")
    .default(0),
});

export type ChannelInput = z.infer<typeof channelInputSchema>;

export const contentInputSchema = z.object({
  title: z.string().trim().min(1, "Nhập tiêu đề").max(200),
  kind: contentKindSchema,
  channel_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  content: z.string().trim().min(1, "Nội dung trống").max(200_000),
  ai_provider: z.string().trim().max(60).optional().nullable(),
});

export const aiGenerateSchema = z.object({
  task: aiTaskSchema.default("general"),
  prompt: z.string().trim().min(3, "Nhập yêu cầu").max(20_000),
  provider: aiProviderSchema.optional(),
  channelId: z.string().uuid().optional(),
  tone: z.string().trim().max(120).optional(),
  audience: z.string().trim().max(200).optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Nhập tên hiển thị")
    .max(120, "Tên tối đa 120 ký tự"),
});

export const mediaJobSchema = z.object({
  kind: z.enum(["music", "voice"]),
  prompt: z
    .string()
    .trim()
    .min(3, "Nhập mô tả hoặc nội dung")
    .max(8000, "Tối đa 8000 ký tự"),
  channel_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  vocal_language: z.string().trim().max(10).optional(),
  lyrics: z.string().trim().max(8000).optional(),
  voice: z.string().trim().max(60).optional(),
});

export const companyVerticalSchema = z.enum([
  "affiliate",
  "publishing",
  "media",
  "software",
  "other",
]);

export const companySchema = z.object({
  name: z.string().trim().min(2, "Tên công ty tối thiểu 2 ký tự").max(120),
  vertical: companyVerticalSchema,
  mission: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : null)),
  monthly_budget_usd: z.coerce
    .number()
    .min(0, "Ngân sách không âm")
    .max(100_000)
    .default(15),
  daily_token_budget: z.coerce
    .number()
    .int()
    .min(1000)
    .max(1_000_000)
    .default(100_000),
  autonomy_level: z.coerce.number().int().min(0).max(3).default(1),
});

export const companyUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "paused", "archived"]),
  autonomy_level: z.coerce.number().int().min(0).max(3),
  monthly_budget_usd: z.coerce.number().min(0).max(100_000),
  daily_token_budget: z.coerce.number().int().min(1000).max(1_000_000),
  mission: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const agentSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(2, "Tên agent tối thiểu 2 ký tự").max(120),
  role: z.enum(["ceo", "manager", "specialist", "worker"]),
  parent_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  title: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => (value ? value : null)),
  system_prompt: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .transform((value) => (value ? value : null)),
  provider: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  model: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : null)),
  max_tokens_per_run: z.coerce
    .number()
    .int()
    .min(256, "Tối thiểu 256 token")
    .max(32_000)
    .default(4000),
  daily_token_budget: z.coerce
    .number()
    .int()
    .min(500, "Tối thiểu 500 token/ngày")
    .max(200_000)
    .default(15000),
});

export const workflowStepSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1, "Nhập tên bước").max(200),
  mode: z.enum(["text", "voice", "music", "note"]),
  instruction: z
    .string()
    .trim()
    .min(1, "Nhập hướng dẫn cho bước")
    .max(4000),
});

export const agentSettingsSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    system_prompt: z
      .string()
      .trim()
      .max(8000)
      .optional()
      .transform((value) => (value ? value : null)),
    workflow: z
      .array(workflowStepSchema)
      .min(1, "Cần ít nhất 1 bước")
      .max(30, "Tối đa 30 bước"),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    value.workflow.forEach((step, index) => {
      if (ids.has(step.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Mã bước bị trùng",
          path: ["workflow", index, "id"],
        });
      }
      ids.add(step.id);
    });
  });

export const agentTaskSchema = z.object({
  company_id: z.string().uuid(),
  channel_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  agent_id: z.string().uuid("Chọn agent thực hiện"),
  title: z.string().trim().min(3, "Nhập tiêu đề nhiệm vụ").max(200),
  brief: z.string().trim().min(3, "Nhập mô tả nhiệm vụ").max(20_000),
  requires_approval: z.coerce.boolean().default(true),
});

export const knowledgeCategorySchema = z.enum([
  "prompt",
  "playbook",
  "brand",
  "reference",
  "sop",
]);

export const knowledgeDocSchema = z.object({
  title: z.string().trim().min(2, "Nhập tiêu đề tài liệu").max(200),
  category: knowledgeCategorySchema,
  domain: z.string().trim().min(1, "Chọn mảng tài liệu").max(60),
  company_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  content: z
    .string()
    .trim()
    .min(10, "Nội dung tối thiểu 10 ký tự")
    .max(50_000),
  tags: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    ),
  pinned: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});

export const knowledgeDocUpdateSchema = knowledgeDocSchema.extend({
  id: z.string().uuid(),
});

export const aiSettingsSchema = z.object({
  monthly_budget_usd: z.coerce.number().min(0).max(1_000_000),
  alert_threshold_pct: z.coerce.number().int().min(10).max(100),
  hard_stop: z.coerce.boolean(),
});

export const revenueSourceSchema = z.enum([
  "affiliate",
  "product_sales",
  "ads",
  "sponsorship",
  "other",
]);

export const expenseCategorySchema = z.enum([
  "tools",
  "vps",
  "ads",
  "contractor",
  "media",
  "other",
]);

export const revenueEntrySchema = z.object({
  company_id: z.string().uuid(),
  channel_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  source: revenueSourceSchema,
  platform: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value ? value : null)),
  amount_vnd: z.coerce
    .number()
    .min(0, "Số tiền không âm")
    .max(1_000_000_000_000),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
  external_ref: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const expenseEntrySchema = z.object({
  company_id: z.string().uuid(),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  category: expenseCategorySchema,
  amount_vnd: z.coerce
    .number()
    .min(0, "Số tiền không âm")
    .max(1_000_000_000_000),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const revenuePlanSchema = z.object({
  company_id: z.string().uuid(),
  monthly_revenue_target_vnd: z.coerce.number().min(0).max(1_000_000_000_000),
  monthly_views: z.coerce.number().int().min(0).max(1_000_000_000),
  ctr_pct: z.coerce.number().min(0).max(100),
  conversion_pct: z.coerce.number().min(0).max(100),
  avg_order_value_vnd: z.coerce.number().min(0).max(1_000_000_000),
  commission_pct: z.coerce.number().min(0).max(100),
  ads_budget_vnd: z.coerce.number().min(0).max(1_000_000_000_000),
  usd_vnd_rate: z.coerce.number().int().min(1000).max(100_000),
});

export const facebookConnectSchema = z.object({
  company_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null)),
  page_id: z
    .string()
    .trim()
    .regex(/^\d{5,25}$/, "Page ID chỉ gồm chữ số"),
  access_token: z
    .string()
    .trim()
    .min(40, "Page Access Token quá ngắn")
    .max(5000),
});

export const facebookPostSchema = z.object({
  account_id: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1, "Nhập nội dung bài đăng")
    .max(5000, "Tối đa 5000 ký tự"),
});
