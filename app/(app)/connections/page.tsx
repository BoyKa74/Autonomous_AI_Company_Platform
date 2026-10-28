import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getLatestPlatformMetrics,
  listCompanies,
  listPlatformAccounts,
} from "@/lib/data";
import {
  disconnectAccount,
  syncFacebook,
  syncTikTok,
  syncYouTube,
} from "@/app/actions/connections";
import {
  FacebookConnectForm,
  FacebookPublishForm,
} from "@/components/connections/facebook-forms";
import { SubmitButton } from "@/components/ui/submit-button";
import { CompanyNav } from "@/components/company/company-nav";
import { getLocale } from "@/lib/i18n/server";
import {
  Alert,
  EmptyState,
  Eyebrow,
  Panel,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { formatDateTime } from "@/lib/utils";
import type { Json } from "@/types/database";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Channel connections" };

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook Page",
  tiktok: "TikTok",
  youtube: "YouTube",
  shopee: "Shopee",
};

type Metrics = Record<string, unknown>;

function num(metrics: Metrics, key: string): number | undefined {
  const value = metrics[key];
  return typeof value === "number" ? value : undefined;
}

export default async function ConnectionsPage({
  searchParams,
}: PageProps<"/connections">) {
  await connection();
  const locale = await getLocale();
  await requireUser();
  const params = await searchParams;

  const connected =
    typeof params.connected === "string" ? params.connected : null;
  const error = typeof params.error === "string" ? params.error : null;

  const companies = await listCompanies();
  const selectedCompany =
    typeof params.company === "string"
      ? companies.find((company) => company.id === params.company) ?? null
      : null;
  const accounts = await listPlatformAccounts(selectedCompany?.id);
  const metrics = await getLatestPlatformMetrics(
    accounts.map((account) => account.id)
  );

  const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const googleReady = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const tiktokReady = Boolean(
    process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET
  );

  return (
    <div className="space-y-6 rise-in">
      <header>
        <Eyebrow>
          {selectedCompany ? tr(locale, "Công ty AI") : tr(locale, "Kênh chính thức")}
        </Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {selectedCompany
            ? `${tr(locale, "Kết nối kênh")} · ${selectedCompany.name}`
            : tr(locale, "Kết nối kênh")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-fog-500">
          {tr(
            locale,
            "Kết nối bằng OAuth chính thức của từng nền tảng. Token truy cập và refresh token được mã hoá AES-256-GCM phía server, tự động làm mới khi đồng bộ."
          )}
        </p>
      </header>

      {selectedCompany && <CompanyNav company={selectedCompany}  locale={locale} />}

      {connected && (
        <Alert tone="success">
          {tr(locale, "Đã kết nối")} {PLATFORM_LABEL[connected] ?? connected}.{" "}
          {tr(locale, "Bấm “Đồng bộ số liệu” để lấy dữ liệu thật.")}
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          eyebrow="YouTube"
          title={tr(locale, "Kết nối kênh YouTube")}
        >
          <p className="text-sm text-fog-500">
            {tr(
              locale,
              "Dùng OAuth Google để lấy subscriber, view, video và (sau này) đăng video."
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {googleReady ? (
              <Link
                href="/api/oauth/youtube"
                className={buttonStyles("primary")}
              >
                {tr(locale, "Kết nối YouTube")}
              </Link>
            ) : (
              <Tag className="text-warn-400">
                {tr(locale, "Chưa cấu hình")} GOOGLE_CLIENT_ID / SECRET
              </Tag>
            )}
          </div>
          <details className="mt-4 text-sm text-fog-300">
            <summary className="cursor-pointer font-medium text-fog-100">
              {tr(locale, "Cách thiết lập (Google Cloud)")}
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
              <li>
                console.cloud.google.com → {tr(locale, "tạo project → bật")}{" "}
                <b>YouTube Data API v3</b>.
              </li>
              <li>
                {tr(
                  locale,
                  "OAuth consent screen → External → thêm email của bạn vào Test users."
                )}
              </li>
              <li>
                {tr(
                  locale,
                  "Credentials → Create credentials → OAuth client ID → loại Web."
                )}
              </li>
              <li>
                Authorized redirect URI:{" "}
                <code className="break-all text-fog-300">
                  {baseUrl}/api/oauth/youtube/callback
                </code>
              </li>
              <li>
                {tr(locale, "Thêm")} <code>GOOGLE_CLIENT_ID</code>{" "}
                {tr(locale, "và")} <code>GOOGLE_CLIENT_SECRET</code>{" "}
                {tr(locale, "vào .env.local rồi restart.")}
              </li>
            </ol>
          </details>
        </Panel>

        <Panel
          eyebrow="TikTok"
          title={tr(locale, "Kết nối kênh TikTok")}
        >
          <p className="text-sm text-fog-500">
            {tr(
              locale,
              "Dùng TikTok Login Kit để lấy hồ sơ, số video và chỉ số video gần đây."
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tiktokReady ? (
              <Link
                href="/api/oauth/tiktok"
                className={buttonStyles("primary")}
              >
                {tr(locale, "Kết nối TikTok")}
              </Link>
            ) : (
              <Tag className="text-warn-400">
                {tr(locale, "Chưa cấu hình")} TIKTOK_CLIENT_KEY / SECRET
              </Tag>
            )}
          </div>
          <details className="mt-4 text-sm text-fog-300">
            <summary className="cursor-pointer font-medium text-fog-100">
              {tr(locale, "Cách thiết lập (TikTok for Developers)")}
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
              <li>
                developers.tiktok.com → Manage apps →{" "}
                {tr(
                  locale,
                  "tạo app (Login Kit + Content Posting API nếu muốn đăng video)."
                )}
              </li>
              <li>
                Redirect URI:{" "}
                <code className="break-all text-fog-300">
                  {baseUrl}/api/oauth/tiktok/callback
                </code>{" "}
                {tr(
                  locale,
                  "(production cần HTTPS; localhost có thể phải dùng tunnel)."
                )}
              </li>
              <li>
                {tr(locale, "Thêm")} <code>TIKTOK_CLIENT_KEY</code>{" "}
                {tr(locale, "và")} <code>TIKTOK_CLIENT_SECRET</code>{" "}
                {tr(locale, "vào .env.local rồi restart.")}
              </li>
              <li>
                {tr(locale, "Quyền")} <code>video.list</code>{" "}
                {tr(
                  locale,
                  "phải được TikTok duyệt; trước khi duyệt chỉ đọc được hồ sơ cơ bản."
                )}
              </li>
            </ol>
          </details>
        </Panel>
      </div>

      <Panel
        eyebrow="Facebook"
        title={tr(locale, "Kết nối Page mới")}
      >
        <FacebookConnectForm
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          locale={locale}
        />
        <details className="mt-4 text-sm text-fog-300">
          <summary className="cursor-pointer font-medium text-fog-100">
            {tr(locale, "Cách lấy Page Access Token (Graph API Explorer)")}
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
            <li>
              developers.facebook.com → Create App → Business →{" "}
              {tr(locale, "thêm")} <b>Graph API Explorer</b>.
            </li>
            <li>
              {tr(locale, "Thêm quyền:")} <code>pages_show_list</code>,{" "}
              <code>pages_read_engagement</code>,{" "}
              <code>pages_manage_posts</code>, <code>read_insights</code>.
            </li>
            <li>
              Generate Access Token → {tr(locale, "gọi")}{" "}
              <code>GET /me/accounts</code> → copy <b>id</b> +{" "}
              <b>access_token</b> {tr(locale, "của Page → dán vào form.")}
            </li>
            <li>
              {tr(
                locale,
                "App ở Development mode chỉ hoạt động với admin/tester; production cần App Review + Business Verification."
              )}
            </li>
          </ol>
        </details>
      </Panel>

      {accounts.length === 0 ? (
        <EmptyState
          title={tr(locale, "Chưa kết nối kênh nào")}
          description={tr(
            locale,
            "Kết nối YouTube, TikTok hoặc Facebook ở trên. Sau khi kết nối, bấm Đồng bộ số liệu để lấy dữ liệu thật."
          )}
        />
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const accountMetrics = (metrics[account.id]?.metrics ??
              null) as Metrics | null;
            const metadata = account.metadata as Json;
            const warnings = Array.isArray(accountMetrics?.warnings)
              ? (accountMetrics?.warnings as unknown[]).map(String)
              : [];
            const syncAction =
              account.platform === "facebook"
                ? syncFacebook
                : account.platform === "youtube"
                  ? syncYouTube
                  : account.platform === "tiktok"
                    ? syncTikTok
                    : null;

            return (
              <Panel
                key={account.id}
                eyebrow={PLATFORM_LABEL[account.platform] ?? account.platform}
                title={account.account_name ?? account.account_id}
                bodyClassName="space-y-4 p-4"
                actions={
                  <span className="flex items-center gap-2">
                    <Tag
                      className={
                        account.status === "connected"
                          ? "text-ok-400"
                          : "text-bad-400"
                      }
                    >
                      {account.status === "connected"
                        ? tr(locale, "đã kết nối")
                        : tr(locale, "lỗi")}
                    </Tag>
                    <Tag>{account.account_id.slice(0, 18)}</Tag>
                  </span>
                }
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-fog-600">
                  <span>
                    {tr(locale, "Đồng bộ lần cuối:")}{" "}
                    {account.last_synced_at
                      ? formatDateTime(account.last_synced_at, locale)
                      : tr(locale, "chưa đồng bộ")}
                  </span>
                  {account.company_id && (
                    <Tag>
                      {companies.find(
                        (company) => company.id === account.company_id
                      )?.name ?? tr(locale, "Công ty")}
                    </Tag>
                  )}
                  {typeof metadata === "object" &&
                    metadata !== null &&
                    !Array.isArray(metadata) &&
                    metadata.last_error && (
                      <span className="text-bad-400">
                        {String(metadata.last_error)}
                      </span>
                    )}
                </div>

                {accountMetrics ? (
                  <PlatformMetrics
                    platform={account.platform}
                    metrics={accountMetrics}
                    locale={locale}
                  />
                ) : (
                  <p className="text-sm text-fog-500">
                    {tr(
                      locale,
                      "Chưa có số liệu — bấm Đồng bộ số liệu để gọi API."
                    )}
                  </p>
                )}

                {warnings.length > 0 && (
                  <p className="text-xs text-warn-400">{warnings.join(" ")}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {syncAction && (
                    <form action={syncAction}>
                      <input type="hidden" name="id" value={account.id} />
                      <SubmitButton size="sm" pendingText={tr(locale, "Đang đồng bộ…")}>
                        {tr(locale, "Đồng bộ số liệu")}
                      </SubmitButton>
                    </form>
                  )}
                  <form action={disconnectAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <SubmitButton
                      size="sm"
                      variant="danger"
                      pendingText={tr(locale, "Đang xoá…")}
                      confirm={tr(
                        locale,
                        "Ngắt kết nối kênh này? Token lưu trong hệ thống sẽ bị xoá."
                      )}
                    >
                      {tr(locale, "Ngắt kết nối")}
                    </SubmitButton>
                  </form>
                </div>

                {account.platform === "facebook" && (
                  <div className="border-t border-ink-700 pt-3">
                    <FacebookPublishForm
                      accountId={account.id}
                      accountName={account.account_name ?? account.account_id}
                      locale={locale}
                    />
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-fog-600">
        {tr(
          locale,
          "Facebook dùng Page token; YouTube/TikTok dùng OAuth và tự refresh. Toàn bộ token được mã hoá phía server. “Đăng thử” Facebook gọi API thật — kiểm tra nội dung trước khi bấm."
        )}
      </p>
    </div>
  );
}

function PlatformMetrics({
  platform,
  metrics,
  locale,
}: {
  platform: string;
  metrics: Metrics;
  locale: "en" | "vi";
}) {
  const items: { label: string; value: number | undefined }[] =
    platform === "youtube"
      ? [
          { label: tr(locale, "Subscriber"), value: num(metrics, "subscribers") },
          { label: tr(locale, "Tổng view"), value: num(metrics, "totalViews") },
          { label: tr(locale, "Số video"), value: num(metrics, "videoCount") },
          { label: tr(locale, "View 20 video mới"), value: num(metrics, "recentViews") },
          { label: tr(locale, "Like 20 video mới"), value: num(metrics, "recentLikes") },
          { label: tr(locale, "Comment 20 video mới"), value: num(metrics, "recentComments") },
        ]
      : platform === "tiktok"
        ? [
            { label: "Follower", value: num(metrics, "followers") },
            { label: tr(locale, "Tổng like"), value: num(metrics, "likes") },
            { label: tr(locale, "Số video"), value: num(metrics, "videoCount") },
            { label: tr(locale, "View 20 video mới"), value: num(metrics, "recentViews") },
            { label: tr(locale, "Like 20 video mới"), value: num(metrics, "recentLikes") },
            { label: tr(locale, "Share 20 video mới"), value: num(metrics, "recentShares") },
          ]
        : [
            { label: "Follower", value: num(metrics, "followers") },
            {
              label: `${tr(locale, "Like")} (${num(metrics, "postsAnalyzed") ?? 0} ${tr(locale, "bài")})`,
              value: num(metrics, "likes"),
            },
            { label: tr(locale, "Comment"), value: num(metrics, "comments") },
            { label: tr(locale, "Share"), value: num(metrics, "shares") },
          ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <Metric
          key={item.label}
          label={item.label}
          value={item.value}
          locale={locale}
        />
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  locale,
}: {
  label: string;
  value?: number;
  locale: "en" | "vi";
}) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fog-600">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-fog-100">
        {value === undefined
          ? "—"
          : value.toLocaleString(locale === "en" ? "en-US" : "vi-VN")}
      </p>
    </div>
  );
}
