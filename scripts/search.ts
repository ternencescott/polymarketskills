// 搜索市场
// 用法: bun run scripts/search.ts <keyword> [limit]
// 示例: bun run scripts/search.ts bitcoin 10

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

async function searchMarkets(query: string, limit: number = 5): Promise<void> {
    console.log(`\n🔍 搜索: "${query}"\n`);

    const response = await axios.get(`${GAMMA_API_HOST}/public-search`, {
        params: {
            q: query,
            limit_per_type: limit,
            events_status: "active",
        },
    });

    const { events, tags } = response.data;

    if (!events || events.length === 0) {
        console.log("未找到匹配的事件");
        return;
    }

    for (const event of events) {
        console.log(`📌 ${event.title}`);
        console.log(`   Event ID: ${event.id}`);
        console.log(`   Volume: $${event.volume?.toLocaleString() ?? "N/A"}`);
        console.log(`   URL: https://polymarket.com/event/${event.slug}`);

        for (const market of event.markets) {
            console.log(`\n   Market: ${market.question}`);
            console.log(`   Market ID: ${market.id}`);
            console.log(`   Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
            console.log(`   Neg Risk: ${market.negRisk ?? "N/A"}`);

            if (market.tokens && market.tokens.length > 0) {
                for (const token of market.tokens) {
                    console.log(`     - ${token.outcome}: ${token.token_id}`);
                }
            }
        }
        console.log("---");
    }

    if (tags && tags.length > 0) {
        console.log("\n🏷️ 相关标签:");
        for (const tag of tags) {
            console.log(`   ${tag.label} (${tag.event_count} events)`);
        }
    }
}

// CLI entry
const query = process.argv[2];
const limit = parseInt(process.argv[3]) || 5;

if (!query) {
    console.error("用法: bun run scripts/search.ts <keyword> [limit]");
    process.exit(1);
}

searchMarkets(query, limit).catch(console.error);
