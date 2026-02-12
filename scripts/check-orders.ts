// 查看活跃订单
// 用法:
//   bun run scripts/check-orders.ts                                        # 查看所有订单
//   bun run scripts/check-orders.ts --token <ID>                           # 按 token 过滤
//   bun run scripts/check-orders.ts --market <ID>                          # 按 market/condition ID 过滤
//   bun run scripts/check-orders.ts --market bitcoin-up-or-down            # 按 slug 自动解析
//   bun run scripts/check-orders.ts --market https://polymarket.com/event/bitcoin-up-or-down  # 按 URL 自动解析

import { getClobClient, GAMMA_API_HOST } from "./config";
import axios from "axios";

// 判断输入是否为 slug 或 URL（而非 hex/数字 ID）
function isSlugOrUrl(value: string): boolean {
    if (value.startsWith("http://") || value.startsWith("https://")) return true;
    // condition ID / token ID 通常是 0x 开头的 hex 或纯数字长串
    if (/^0x[0-9a-fA-F]+$/.test(value)) return false;
    if (/^\d{10,}$/.test(value)) return false;
    // 包含字母和连字符，大概率是 slug
    if (/[a-zA-Z]/.test(value) && /[-a-zA-Z]/.test(value)) return true;
    return false;
}

// 从 slug 或 URL 解析出 event 下所有 token ID 及市场信息
async function resolveSlugToTokenIds(input: string): Promise<{ tokenIds: string[]; title: string; markets: { question: string; tokenIds: string[] }[] }> {
    let slug = input;
    if (slug.startsWith("http")) {
        const urlObj = new URL(slug);
        const parts = urlObj.pathname.split("/");
        slug = parts[parts.length - 1];
    }

    console.log(`🔍 解析 slug: ${slug} ...`);
    const response = await axios.get(`${GAMMA_API_HOST}/events`, { params: { slug } });
    const events = response.data;

    if (!events || events.length === 0) {
        console.error(`❌ 未找到 slug "${slug}" 对应的 event`);
        process.exit(1);
    }

    const event = events[0];
    const allTokenIds: string[] = [];
    const markets: { question: string; tokenIds: string[] }[] = [];

    for (const market of event.markets) {
        const mTokenIds: string[] = [];
        if (market.tokens && market.tokens.length > 0) {
            for (const token of market.tokens) {
                mTokenIds.push(token.token_id);
                allTokenIds.push(token.token_id);
            }
        }
        markets.push({ question: market.question, tokenIds: mTokenIds });
    }

    return { tokenIds: allTokenIds, title: event.title, markets };
}

function printOrders(orders: any[]): void {
    for (let i = 0; i < orders.length; i++) {
        const o = orders[i] as any;
        console.log(`${i + 1}. Order ID: ${o.id}`);
        console.log(`   Side: ${o.side}, Type: ${o.order_type || "GTC"}`);
        console.log(`   Price: ${(parseFloat(o.price) * 100).toFixed(1)}¢`);
        console.log(`   Size: ${o.original_size} shares, Matched: ${o.size_matched || "0"}`);
        console.log(`   Token: ${o.asset_id}`);
        console.log(`   Status: ${o.status}`);
        if (o.created_at) {
            console.log(`   Created: ${new Date(parseInt(o.created_at) * 1000).toLocaleString()}`);
        }
        console.log("");
    }

    const buys = orders.filter((o: any) => o.side === "BUY").length;
    const sells = orders.filter((o: any) => o.side === "SELL").length;
    console.log(`📈 Buy: ${buys}, 📉 Sell: ${sells}`);
}

async function checkOrders(opts: { tokenId?: string; marketValue?: string }): Promise<void> {
    const client = await getClobClient();

    // 直接按 token ID 查询
    if (opts.tokenId) {
        const orders = await client.getOpenOrders({ asset_id: opts.tokenId });
        if (!orders || orders.length === 0) {
            console.log("📭 没有活跃订单");
            return;
        }
        console.log(`找到 ${orders.length} 个活跃订单\n`);
        printOrders(orders);
        return;
    }

    // --market: 智能判断是 slug/URL 还是原始 ID
    if (opts.marketValue) {
        if (isSlugOrUrl(opts.marketValue)) {
            const resolved = await resolveSlugToTokenIds(opts.marketValue);
            console.log(`📌 ${resolved.title}\n`);

            let totalOrders: any[] = [];
            for (const m of resolved.markets) {
                console.log(`   Market: ${m.question}`);
                for (const tid of m.tokenIds) {
                    const orders = await client.getOpenOrders({ asset_id: tid });
                    if (orders && orders.length > 0) {
                        totalOrders.push(...orders);
                    }
                }
            }
            console.log("");

            if (totalOrders.length === 0) {
                console.log("📭 该 event 下没有活跃订单");
                return;
            }
            console.log(`找到 ${totalOrders.length} 个活跃订单\n`);
            printOrders(totalOrders);
        } else {
            // 当作 asset_id 直接查
            const orders = await client.getOpenOrders({ asset_id: opts.marketValue });
            if (!orders || orders.length === 0) {
                console.log("📭 没有活跃订单");
                return;
            }
            console.log(`找到 ${orders.length} 个活跃订单\n`);
            printOrders(orders);
        }
        return;
    }

    // 无参数: 查询所有
    const orders = await client.getOpenOrders();
    if (!orders || orders.length === 0) {
        console.log("📭 没有活跃订单");
        return;
    }
    console.log(`找到 ${orders.length} 个活跃订单\n`);
    printOrders(orders);
}

// CLI entry - parse args
const args = process.argv.slice(2);
let tokenId: string | undefined;
let marketValue: string | undefined;

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--token" && args[i + 1]) {
        tokenId = args[++i];
    } else if (args[i] === "--market" && args[i + 1]) {
        marketValue = args[++i];
    }
}

checkOrders({ tokenId, marketValue }).catch(console.error);
