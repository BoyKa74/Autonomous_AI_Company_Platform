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

export const metadata: Metadata = { title: "Kết nối kênh" };

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
  await requireUser();
  const params = await searchParams;

  const connected =
    typeof params.connected === "string" ? params.connected : null;
  const error = typeof params.error === "string" ? params.error : null;

  const accounts = await listPlatformAccounts();
  const metrics = await getLatestPlatformMetrics(
    accounts.map((account) => account.id)
  );
  const companies = await listCompanies();

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
        <Eyebrow>Kênh chính thức</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Kết nối kênh
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-fog-500">
          Kết nối bằng OAuth chính thức của từng nền tảng. Token truy cập và
          refresh token được mã hoá AES-256-GCM phía server, tự động làm mới khi
          đồng bộ.
        </p>
      </header>

      {connected && (
        <Alert tone="success">
          Đã kết nối {PLATFORM_LABEL[connected] ?? connected}. Bấm “Đồng bộ số
          liệu” để lấy dữ liệu thật.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="YouTube" title="Kết nối kênh YouTube">
          <p className="text-sm text-fog-500">
            Dùng OAuth Google để lấy subscriber, view, video và (sau này) đăng
            video.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {googleReady ? (
              <Link
                href="/api/oauth/youtube"
                className={buttonStyles("primary")}
              >
                Kết nối YouTube
              </Link>
            ) : (
              <Tag className="text-warn-400">
                Chưa cấu hình GOOGLE_CLIENT_ID / SECRET
              </Tag>
            )}
          </div>
          <details className="mt-4 text-sm text-fog-300">
            <summary className="cursor-pointer font-medium text-fog-100">
              Cách thiết lập (Google Cloud)
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
              <li>
                console.cloud.google.com → tạo project → bật{" "}
                <b>YouTube Data API v3</b>.
              </li>
              <li>
                OAuth consent screen → External → thêm email của bạn vào Test
                users.
              </li>
              <li>
                Credentials → Create credentials → OAuth client ID → loại Web.
              </li>
              <li>
                Authorized redirect URI:{" "}
                <code className="break-all text-fog-300">
                  {baseUrl}/api/oauth/youtube/callback
                </code>
              </li>
              <li>
                Thêm <code>GOOGLE_CLIENT_ID</code> và{" "}
                <code>GOOGLE_CLIENT_SECRET</code> vào .env.local rồi restart.
              </li>
            </ol>
          </details>
        </Panel>

        <Panel eyebrow="TikTok" title="Kết nối kênh TikTok">
          <p className="text-sm text-fog-500">
            Dùng TikTok Login Kit để lấy hồ sơ, số video và chỉ số video gần
            đây.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tiktokReady ? (
              <Link
                href="/api/oauth/tiktok"
                className={buttonStyles("primary")}
              >
                Kết nối TikTok
              </Link>
            ) : (
              <Tag className="text-warn-400">
                Chưa cấu hình TIKTOK_CLIENT_KEY / SECRET
              </Tag>
            )}
          </div>
          <details className="mt-4 text-sm text-fog-300">
            <summary className="cursor-pointer font-medium text-fog-100">
              Cách thiết lập (TikTok for Developers)
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
              <li>
                developers.tiktok.com → Manage apps → tạo app (Login Kit + Content
                Posting API nếu muốn đăng video).
              </li>
              <li>
                Redirect URI:{" "}
                <code className="break-all text-fog-300">
                  {baseUrl}/api/oauth/tiktok/callback
                </code>{" "}
                (production cần HTTPS; localhost có thể phải dùng tunnel).
              </li>
              <li>
                Thêm <code>TIKTOK_CLIENT_KEY</code> và{" "}
                <code>TIKTOK_CLIENT_SECRET</code> vào .env.local rồi restart.
              </li>
              <li>
                Quyền <code>video.list</code> phải được TikTok duyệt; trước khi
                duyệt chỉ đọc được hồ sơ cơ bản.
              </li>
            </ol>
          </details>
        </Panel>
      </div>

      <Panel eyebrow="Facebook" title="Kết nối Page mới">
        <FacebookConnectForm
          companies={companies.map((company) => ({
            id: company.id,
            name: company.name,
          }))}
        />
        <details className="mt-4 text-sm text-fog-300">
          <summary className="cursor-pointer font-medium text-fog-100">
            Cách lấy Page Access Token (Graph API Explorer)
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-fog-500">
            <li>
              developers.facebook.com → Create App → Business → thêm{" "}
              <b>Graph API Explorer</b>.
            </li>
            <li>
              Thêm quyền: <code>pages_show_list</code>,{" "}
              <code>pages_read_engagement</code>,{" "}
              <code>pages_manage_posts</code>, <code>read_insights</code>.
            </li>
            <li>
              Generate Access Token → gọi <code>GET /me/accounts</code> → copy{" "}
              <b>id</b> + <b>access_token</b> của Page → dán vào form.
            </li>
            <li>
              App ở Development mode chỉ hoạt động với admin/tester; production
              cần App Review + Business Verification.
            </li>
          </ol>
        </details>
      </Panel>

      {accounts.length === 0 ? (
        <EmptyState
          title="Chưa kết nối kênh nào"
          description="Kết nối YouTube, TikTok hoặc Facebook ở trên. Sau khi kết nối, bấm Đồng bộ số liệu để lấy dữ liệu thật."
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
                      {account.status === "connected" ? "đã kết nối" : "lỗi"}
                    </Tag>
                    <Tag>{account.account_id.slice(0, 18)}</Tag>
                  </span>
                }
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-fog-600">
                  <span>
                    Đồng bộ lần cuối:{" "}
                    {account.last_synced_at
                      ? formatDateTime(account.last_synced_at)
                      : "chưa đồng bộ"}
                  </span>
                  {account.company_id && (
                    <Tag>
                      {companies.find(
                        (company) => company.id === account.company_id
                      )?.name ?? "Công ty"}
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
                  />
                ) : (
                  <p className="text-sm text-fog-500">
                    Chưa có số liệu — bấm Đồng bộ số liệu để gọi API.
                  </p>
                )}

                {warnings.length > 0 && (
                  <p className="text-xs text-warn-400">{warnings.join(" ")}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {syncAction && (
                    <form action={syncAction}>
                      <input type="hidden" name="id" value={account.id} />
                      <SubmitButton size="sm" pendingText="Đang đồng bộ…">
                        Đồng bộ số liệu
                      </SubmitButton>
                    </form>
                  )}
                  <form action={disconnectAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <SubmitButton
                      size="sm"
                      variant="danger"
                      pendingText="Đang xoá…"
                      confirm="Ngắt kết nối kênh này? Token lưu trong hệ thống sẽ bị xoá."
                    >
                      Ngắt kết nối
                    </SubmitButton>
                  </form>
                </div>

                {account.platform === "facebook" && (
                  <div className="border-t border-ink-700 pt-3">
                    <FacebookPublishForm
                      accountId={account.id}
                      accountName={account.account_name ?? account.account_id}
                    />
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-fog-600">
        Facebook dùng Page token; YouTube/TikTok dùng OAuth và tự refresh. Toàn
        bộ token được mã hoá phía server. “Đăng thử” Facebook gọi API thật — kiểm
        tra nội dung trước khi bấm.
      </p>
    </div>
  );
}

function PlatformMetrics({
  platform,
  metrics,
}: {
  platform: string;
  metrics: Metrics;
}) {
  const items: { label: string; value: number | undefined }[] =
    platform === "youtube"
      ? [
          { label: "Subscriber", value: num(metrics, "subscribers") },
          { label: "Tổng view", value: num(metrics, "totalViews") },
          { label: "Số video", value: num(metrics, "videoCount") },
          { label: "View 20 video mới", value: num(metrics, "recentViews") },
          { label: "Like 20 video mới", value: num(metrics, "recentLikes") },
          { label: "Comment 20 video mới", value: num(metrics, "recentComments") },
        ]
      : platform === "tiktok"
        ? [
            { label: "Follower", value: num(metrics, "followers") },
            { label: "Tổng like", value: num(metrics, "likes") },
            { label: "Số video", value: num(metrics, "videoCount") },
            { label: "View 20 video mới", value: num(metrics, "recentViews") },
            { label: "Like 20 video mới", value: num(metrics, "recentLikes") },
            { label: "Share 20 video mới", value: num(metrics, "recentShares") },
          ]
        : [
            { label: "Follower", value: num(metrics, "followers") },
            {
              label: `Like (${num(metrics, "postsAnalyzed") ?? 0} bài)`,
              value: num(metrics, "likes"),
            },
            { label: "Comment", value: num(metrics, "comments") },
            { label: "Share", value: num(metrics, "shares") },
          ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <Metric key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fog-600">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-fog-100">
        {value === undefined ? "—" : value.toLocaleString("vi-VN")}
      </p>
    </div>
  );
}
