import type {
  AgentRole,
  AgentTaskStatus,
  ChannelPlatform,
  ChannelStatus,
  CompanyStatus,
  CompanyVertical,
  KnowledgeCategory,
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
  manager_review: { label: "Quản lý duyệt", color: "#7c53c3" },
  review: { label: "Chờ bạn duyệt", color: "#2f6fd6" },
  approved: { label: "Đã duyệt", color: "#18855a" },
  rejected: { label: "Từ chối", color: "#cf3f45" },
  failed: { label: "Lỗi", color: "#cf3f45" },
  canceled: { label: "Đã huỷ", color: "#6b7686" },
};

export const KNOWLEDGE_CATEGORIES: Record<
  KnowledgeCategory,
  { label: string; color: string }
> = {
  prompt: { label: "Prompt", color: "#cd8615" },
  playbook: { label: "Playbook", color: "#2f6fd6" },
  brand: { label: "Thương hiệu", color: "#7c53c3" },
  reference: { label: "Tham khảo", color: "#0f8f9c" },
  sop: { label: "Quy trình (SOP)", color: "#18855a" },
};

export const KNOWLEDGE_DOMAINS = [
  "Content Facebook",
  "Content TikTok",
  "Content YouTube",
  "SEO & Website",
  "Sản xuất video",
  "Nhạc & Audio",
  "Sách & Xuất bản",
  "Bán hàng & Affiliate",
  "Thương hiệu",
  "Vận hành & Quy trình",
  "Chung",
];

export const REVENUE_SOURCES: Record<
  "affiliate" | "product_sales" | "ads" | "sponsorship" | "other",
  { label: string; color: string }
> = {
  affiliate: { label: "Hoa hồng affiliate", color: "#cd8615" },
  product_sales: { label: "Bán sản phẩm", color: "#18855a" },
  ads: { label: "Quảng cáo / CPM", color: "#2f6fd6" },
  sponsorship: { label: "Tài trợ / Booking", color: "#7c53c3" },
  other: { label: "Khác", color: "#5b6675" },
};

export const EXPENSE_CATEGORIES: Record<
  "tools" | "vps" | "ads" | "contractor" | "media" | "other",
  string
> = {
  tools: "Công cụ / phần mềm",
  vps: "Máy chủ / VPS",
  ads: "Ngân sách quảng cáo",
  contractor: "Nhân sự / CTV",
  media: "Sản xuất media",
  other: "Khác",
};

export const CHANNEL_NICHES: Record<string, string> = {
  news: "Tin tức",
  affiliate_home: "Gia đình + Affiliate",
  movie_review: "Review phim",
  ai_music: "Nhạc AI",
  funny_animals: "Động vật vui",
  short_film: "Phim ngắn",
  home_appliances: "Gia dụng nhà cửa",
  trend_dance: "Dance trend + nhân vật",
  personal_brand: "Cá nhân / kể chuyện",
  electronics: "Điện tử",
  tech_ai: "Tech · AI",
  mom_baby: "Mẹ & Bé",
  engagement_service: "Cộng đồng",
};
