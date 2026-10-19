import type {
  AgentRole,
  AgentTaskStatus,
  ChannelPlatform,
  ChannelStatus,
  CompanyStatus,
  CompanyVertical,
  ContentKind,
  ContentStatus,
} from "@/types/database";

type PlatformMeta = {
  label: string;
  short: string;
  color: string;
  group: "content" | "commerce";
};

export const PLATFORMS: Record<ChannelPlatform, PlatformMeta> = {
  youtube: { label: "YouTube", short: "YT", color: "#d93a3a", group: "content" },
  tiktok: { label: "TikTok", short: "TT", color: "#0f8f9c", group: "content" },
  facebook: { label: "Facebook", short: "FB", color: "#2f6fd6", group: "content" },
  book: { label: "Sách", short: "SÁCH", color: "#7c53c3", group: "content" },
  media: { label: "Truyền thông", short: "MED", color: "#1f8a4c", group: "content" },
  shopee: { label: "Shopee", short: "SP", color: "#d1500f", group: "commerce" },
  tiktok_shop: {
    label: "TikTok Shop",
    short: "TTS",
    color: "#c2255f",
    group: "commerce",
  },
  other: { label: "Kênh khác", short: "KH", color: "#5b6675", group: "commerce" },
};

export const PLATFORM_ORDER: ChannelPlatform[] = [
  "youtube",
  "tiktok",
  "facebook",
  "book",
  "media",
  "shopee",
  "tiktok_shop",
  "other",
];

export const STATUSES: Record<
  ChannelStatus,
  { label: string; color: string; live: boolean }
> = {
  active: { label: "Đang chạy", color: "#18855a", live: true },
  paused: { label: "Tạm dừng", color: "#b07d10", live: false },
  draft: { label: "Nháp", color: "#2f6fd6", live: false },
  archived: { label: "Lưu trữ", color: "#6b7686", live: false },
};

export const STATUS_ORDER: ChannelStatus[] = [
  "active",
  "paused",
  "draft",
  "archived",
];

export const CONTENT_KINDS: Record<ContentKind, string> = {
  video: "Video dài",
  short: "Video ngắn",
  post: "Bài đăng",
  article: "Bài viết",
  book_chapter: "Chương sách",
  product_listing: "Đăng bán SP",
  other: "Khác",
};

export const CONTENT_STATUSES: Record<
  ContentStatus,
  { label: string; color: string }
> = {
  idea: { label: "Ý tưởng", color: "#5b6675" },
  draft: { label: "Nháp", color: "#2f6fd6" },
  review: { label: "Chờ duyệt", color: "#b07d10" },
  scheduled: { label: "Đã lên lịch", color: "#7c53c3" },
  published: { label: "Đã đăng", color: "#18855a" },
  archived: { label: "Lưu trữ", color: "#6b7686" },
};

export const CONTENT_STATUS_ORDER: ContentStatus[] = [
  "idea",
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
];

export const REGIONS = [
  "VN",
  "US",
  "UK",
  "EU",
  "JP",
  "KR",
  "TH",
  "SG",
  "GLOBAL",
] as const;

export const COMPANY_VERTICALS: Record<
  CompanyVertical,
  { label: string; color: string }
> = {
  affiliate: { label: "Affiliate", color: "#cd8615" },
  publishing: { label: "Xuất bản sách", color: "#7c53c3" },
  media: { label: "Media", color: "#0f8f9c" },
  software: { label: "Phần mềm", color: "#2f6fd6" },
  other: { label: "Khác", color: "#5b6675" },
};

export const COMPANY_STATUSES: Record<
  CompanyStatus,
  { label: string; color: string }
> = {
  draft: { label: "Nháp", color: "#2f6fd6" },
  active: { label: "Đang hoạt động", color: "#18855a" },
  paused: { label: "Tạm dừng", color: "#b07d10" },
  archived: { label: "Lưu trữ", color: "#6b7686" },
};

export const AGENT_ROLES: Record<AgentRole, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "#cd8615" },
  ceo: { label: "CEO", color: "#a8760f" },
  manager: { label: "Quản lý", color: "#7c53c3" },
  specialist: { label: "Chuyên viên", color: "#0f8f9c" },
  worker: { label: "Thực thi", color: "#5b6675" },
};

export const TASK_STATUSES: Record<
  AgentTaskStatus,
  { label: string; color: string }
> = {
  queued: { label: "Chờ chạy", color: "#5b6675" },
  running: { label: "Đang chạy", color: "#cd8615" },
  review: { label: "Chờ duyệt", color: "#2f6fd6" },
  approved: { label: "Đã duyệt", color: "#18855a" },
  rejected: { label: "Từ chối", color: "#cf3f45" },
  failed: { label: "Lỗi", color: "#cf3f45" },
  canceled: { label: "Đã huỷ", color: "#6b7686" },
};
