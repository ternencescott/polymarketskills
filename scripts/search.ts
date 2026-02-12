// 搜索市场
// 用法: bun run scripts/search.ts <keyword> [options]
// 示例: bun run scripts/search.ts bitcoin
//        bun run scripts/search.ts bitcoin --limit 10 --expand
//        bun run scripts/search.ts bitcoin --status closed --sort volume --desc
//        bun run scripts/search.ts bitcoin --tag Sports --tag Politics
//        bun run scripts/search.ts bitcoin --no-tags --no-profiles --closed

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

function printUsage() {
    console.log(`
用法: bun run scripts/search.ts <keyword> [options]

选项:
  --limit <n>             每类结果数量 (默认 5)
  --status <s>            事件状态过滤: active, closed, all (默认 active)
  --sort <field>          排序字段: volume, liquidity, startDate, endDate, createdAt 等
  --asc                   升序排列 (默认降序)
  --desc                  降序排列
  --tag <tag>             按标签过滤 (可多次指定)
  --exclude-tag <id>      排除标签 ID (可多次指定)
  --page <n>              分页页码
  --closed                保留已关闭的市场 (keep_closed_markets=1)
  --no-tags               不搜索标签 (search_tags=false)
  --no-profiles           不搜索用户 (search_profiles=false)
  --recurrence <r>        Recurrence 过滤
  --cache                 启用缓存
  --no-cache              禁用缓存
  --optimized             启用优化搜索
  --expand                展开显示子 market 详情
  --json                  输出原始 JSON
  -h, --help              显示帮助
`);
}

interface SearchParams {
    q: string;
    limit_per_type?: number;
    events_status?: string;
    sort?: string;
    ascending?: boolean;
    events_tag?: string[];
    exclude_tag_id?: number[];
    page?: number;
    keep_closed_markets?: number;
    search_tags?: boolean;
    search_profiles?: boolean;
    recurrence?: string;
    cache?: boolean;
    optimized?: boolean;
}

function parseArgs(argv: string[]): {
    params: SearchParams;
    expand: boolean;
    json: boolean;
} {
    const args = argv.slice(2);

    if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
        printUsage();
        process.exit(0);
    }

    let query = "";
    let limit: number | undefined;
    let status: string | undefined;
    let sort: string | undefined;
    let ascending: boolean | undefined;
    let tags: string[] = [];
    let excludeTagIds: number[] = [];
    let page: number | undefined;
    let keepClosed: number | undefined;
    let searchTags: boolean | undefined;
    let searchProfiles: boolean | undefined;
    let recurrence: string | undefined;
    let cache: boolean | undefined;
    let optimized: boolean | undefined;
    let expand = false;
    let json = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case "--limit":
                limit = parseInt(args[++i]);
                break;
            case "--status":
                status = args[++i];
                break;
            case "--sort":
                sort = args[++i];
                break;
            case "--asc":
                ascending = true;
                break;
            case "--desc":
                ascending = false;
                break;
            case "--tag":
                tags.push(args[++i]);
                break;
            case "--exclude-tag":
                excludeTagIds.push(parseInt(args[++i]));
                break;
            case "--page":
                page = parseInt(args[++i]);
                break;
            case "--closed":
                keepClosed = 1;
                break;
            case "--no-tags":
                searchTags = false;
                break;
            case "--no-profiles":
                searchProfiles = false;
                break;
            case "--recurrence":
                recurrence = args[++i];
                break;
            case "--cache":
                cache = true;
                break;
            case "--no-cache":
                cache = false;
                break;
            case "--optimized":
                optimized = true;
                break;
            case "--expand":
                expand = true;
                break;
            case "--json":
                json = true;
                break;
            default:
                if (!arg.startsWith("--") && !query) {
                    query = arg;
                } else if (!arg.startsWith("--") && !limit) {
                    // 兼容旧用法: search.ts <keyword> <limit>
                    limit = parseInt(arg);
                }
                break;
        }
    }

    if (!query) {
        console.error("错误: 必须提供搜索关键词");
        printUsage();
        process.exit(1);
    }

    const params: SearchParams = { q: query };

    if (limit !== undefined) params.limit_per_type = limit;
    else params.limit_per_type = 5;

    if (status === "all") {
        // 不传 events_status，返回所有状态
    } else {
        params.events_status = status ?? "active";
    }

    if (sort) params.sort = sort;
    if (ascending !== undefined) params.ascending = ascending;
    if (tags.length > 0) params.events_tag = tags;
    if (excludeTagIds.length > 0) params.exclude_tag_id = excludeTagIds;
    if (page !== undefined) params.page = page;
    if (keepClosed !== undefined) params.keep_closed_markets = keepClosed;
    if (searchTags !== undefined) params.search_tags = searchTags;
    if (searchProfiles !== undefined) params.search_profiles = searchProfiles;
    if (recurrence) params.recurrence = recurrence;
    if (cache !== undefined) params.cache = cache;
    if (optimized !== undefined) params.optimized = optimized;

    return { params, expand, json };
}

async function searchMarkets(
    params: SearchParams,
    expand: boolean,
    json: boolean
): Promise<void> {
    console.log(`\n🔍 搜索: "${params.q}"\n`);

    const response = await axios.get(`${GAMMA_API_HOST}/public-search`, {
        params,
    });

    const { events, tags, profiles, pagination } = response.data;

    // 原始 JSON 输出
    if (json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }

    // Events
    if (!events || events.length === 0) {
        console.log("未找到匹配的事件");
    } else {
        for (const event of events) {
            console.log(`📌 ${event.title}`);
            console.log(`   Event ID: ${event.id}`);
            console.log(`   Slug: ${event.slug ?? "N/A"}`);
            console.log(`   Status: ${event.closed ? "closed" : event.active ? "active" : "inactive"}`);
            console.log(`   Volume: $${event.volume?.toLocaleString() ?? "N/A"}`);
            if (event.volume24hr) console.log(`   24h Volume: $${event.volume24hr.toLocaleString()}`);
            console.log(`   Liquidity: $${event.liquidity?.toLocaleString() ?? "N/A"}`);
            console.log(`   negRisk: ${event.negRisk ?? false}`);
            console.log(`   URL: https://polymarket.com/event/${event.slug}`);
            console.log(`   Markets: ${event.markets?.length ?? 0}`);

            if (expand && event.markets) {
                for (const market of event.markets) {
                    const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
                    const prices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];

                    console.log(`\n   📊 Market: ${market.question}`);
                    console.log(`      Market ID: ${market.id}`);
                    console.log(`      Condition ID: ${market.conditionId}`);
                    console.log(`      Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
                    console.log(`      Volume: $${Number(market.volume ?? 0).toLocaleString()}`);
                    if (market.bestBid != null || market.bestAsk != null) {
                        console.log(`      Best Bid: ${market.bestBid ?? "N/A"} | Best Ask: ${market.bestAsk ?? "N/A"} | Spread: ${market.spread ?? "N/A"}`);
                    }
                    if (market.lastTradePrice != null) {
                        console.log(`      Last Trade: ${market.lastTradePrice}`);
                    }
                    if (market.oneDayPriceChange != null) {
                        const sign = market.oneDayPriceChange >= 0 ? "+" : "";
                        console.log(`      24h Change: ${sign}${(market.oneDayPriceChange * 100).toFixed(1)}%`);
                    }

                    // outcomes & prices
                    for (let j = 0; j < outcomes.length; j++) {
                        const price = prices[j] ? Number(prices[j]).toFixed(3) : "N/A";
                        console.log(`      ${outcomes[j]}: ${price}`);
                    }

                    // token IDs
                    if (market.clobTokenIds) {
                        const tokenIds = JSON.parse(market.clobTokenIds);
                        for (let j = 0; j < outcomes.length; j++) {
                            console.log(`      ${outcomes[j]} Token: ${tokenIds[j] ?? "N/A"}`);
                        }
                    }

                    console.log(`      negRisk: ${market.negRisk ?? event.negRisk ?? false}`);
                    if (market.endDate) console.log(`      End Date: ${market.endDate}`);
                }
            }
            console.log("---");
        }
    }

    // Tags
    if (tags && tags.length > 0) {
        console.log("\n🏷️ 相关标签:");
        for (const tag of tags) {
            console.log(`   ${tag.label} (${tag.event_count} events) [id: ${tag.id}]`);
        }
    }

    // Profiles
    if (profiles && profiles.length > 0) {
        console.log("\n👤 相关用户:");
        for (const profile of profiles) {
            console.log(`   ${profile.name ?? profile.pseudonym ?? profile.id}`);
            if (profile.bio) console.log(`      ${profile.bio.slice(0, 100)}`);
        }
    }

    // Pagination
    if (pagination) {
        console.log(`\n📄 分页: hasMore=${pagination.hasMore}, total=${pagination.totalResults ?? "N/A"}`);
        if (pagination.hasMore) {
            console.log(`   提示: 使用 --page <n> 获取更多结果`);
        }
    }
}

// CLI entry
const { params, expand, json } = parseArgs(process.argv);
searchMarkets(params, expand, json).catch(console.error);
