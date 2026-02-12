// 获取 Market 详情
// 用法: bun run scripts/getMarketDetail.ts <market_id>
// 示例: bun run scripts/getMarketDetail.ts 1341259

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

async function getMarketDetail(marketId: string): Promise<void> {
    const response = await axios.get(`${GAMMA_API_HOST}/markets/${marketId}`);
    const m = response.data;

    // --- Market 基本信息 ---
    console.log(`\nMarket: ${m.question}`);
    console.log(`Market ID: ${m.id}`);
    console.log(`Condition ID: ${m.conditionId}`);
    console.log(`Slug: ${m.slug ?? "N/A"}`);
    console.log(`Active: ${m.active}  Closed: ${m.closed}  Accepting Orders: ${m.acceptingOrders}`);
    if (m.endDate) console.log(`End Date: ${m.endDate}`);
    if (m.description) console.log(`Description: ${m.description}`);

    // --- 价格 & 成交量 ---
    if (m.outcomes && m.outcomePrices) {
        const outcomes: string[] = JSON.parse(m.outcomes);
        const prices: string[] = JSON.parse(m.outcomePrices);
        console.log(`\nOutcomes:`);
        outcomes.forEach((o, i) => console.log(`  ${o}: ${prices[i] ?? "N/A"}`));
    }
    console.log(`Volume: $${m.volumeNum?.toLocaleString() ?? m.volume ?? "N/A"}`);
    if (m.volume24hr != null) console.log(`24h Volume: $${m.volume24hr.toLocaleString()}`);
    if (m.liquidity) console.log(`Liquidity: $${m.liquidityNum?.toLocaleString() ?? m.liquidity}`);
    if (m.bestBid != null || m.bestAsk != null) {
        console.log(`Best Bid: ${m.bestBid ?? "N/A"}  Best Ask: ${m.bestAsk ?? "N/A"}`);
    }
    if (m.spread != null) console.log(`Spread: ${m.spread}`);

    // --- 下单参数 ---
    console.log(`\nTick Size: ${m.orderPriceMinTickSize ?? "N/A"}`);
    console.log(`Min Order Size: ${m.orderMinSize ?? "N/A"}`);

    // --- Token IDs ---
    if (m.clobTokenIds) {
        let tokenIds: string[];
        try { tokenIds = JSON.parse(m.clobTokenIds); } catch { tokenIds = m.clobTokenIds.split(","); }
        console.log(`\nCLOB Token IDs:`);
        const outcomes: string[] = m.outcomes ? JSON.parse(m.outcomes) : [];
        tokenIds.forEach((id, i) => console.log(`  ${outcomes[i] ?? `[${i}]`}: ${id}`));
    }

    // --- 所属 Event ---
    if (m.events && m.events.length > 0) {
        const e = m.events[0];
        console.log(`\nEvent: ${e.title}`);
        console.log(`  Event ID: ${e.id}`);
        console.log(`  Slug: ${e.slug}`);
        if (e.subtitle) console.log(`  Subtitle: ${e.subtitle}`);
        if (e.description) console.log(`  Description: ${e.description}`);
        if (e.resolutionSource) console.log(`  Resolution Source: ${e.resolutionSource}`);
        console.log(`  Neg Risk: ${e.negRisk ?? "N/A"}`);
    }
}

// CLI entry
const marketId = process.argv[2];

if (!marketId) {
    console.error("用法: bun run scripts/getMarketDetail.ts <market_id>");
    process.exit(1);
}

getMarketDetail(marketId).catch(console.error);
