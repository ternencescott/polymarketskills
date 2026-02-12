// 从 Event URL 或 slug 获取 tokenId
// 用法: bun run scripts/getTokenId.ts <event_url|slug>
// 示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down
//        bun run scripts/getTokenId.ts bitcoin-up-or-down

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

async function getTokenIdFromEventUrl(input: string): Promise<void> {
    let eventSlug: string;
    if (input.startsWith("http://") || input.startsWith("https://")) {
        const urlObj = new URL(input);
        const pathParts = urlObj.pathname.split("/");
        eventSlug = pathParts[pathParts.length - 1];
    } else {
        eventSlug = input;
    }
    console.log(`Event Slug: ${eventSlug}`);

    const response = await axios.get(`${GAMMA_API_HOST}/events`, {
        params: { slug: eventSlug },
    });

    const events = response.data;
    if (!events || events.length === 0) {
        console.log("未找到该 Event");
        return;
    }

    const event = events[0];
    // Filter out resolved markets
    const activeMarkets = event.markets.filter(
        (m: any) => !m.closed && m.active !== false && m.acceptingOrders !== false
    );

    if (activeMarkets.length === 0) {
        console.log(`\nEvent Title: ${event.title}`);
        console.log(`Event ID: ${event.id}`);
        console.log(`\n所有市场已 resolved，无活跃市场。`);
        return;
    }

    // Check if all markets share the same value for dedup fields
    const allSame = (key: string, transform?: (v: any) => any) => {
        const vals = activeMarkets.map((m: any) => transform ? transform(m[key]) : m[key]);
        return vals.every((v: any) => String(v) === String(vals[0])) ? vals[0] : null;
    };
    const sharedTickSize = allSame("orderPriceMinTickSize");
    const sharedNegRisk = allSame("negRisk");
    const sharedMinOrderSize = allSame("orderMinSize");
    const sharedSpread = allSame("spread");

    console.log(`\nEvent Title: ${event.title}`);
    console.log(`Event ID: ${event.id}`);
    // Print shared fields at top
    if (sharedTickSize != null) console.log(`Tick Size: ${sharedTickSize}`);
    if (sharedNegRisk != null) console.log(`Neg Risk: ${sharedNegRisk}`);
    if (sharedMinOrderSize != null) console.log(`Min Order Size: ${sharedMinOrderSize}`);
    if (sharedSpread != null) console.log(`Spread: ${sharedSpread}`);
    console.log(`\n--- Markets & Token IDs (${activeMarkets.length} active) ---\n`);

    for (const market of activeMarkets) {
        console.log(`Market: ${market.question}`);
        console.log(`Market ID: ${market.id}`);
        console.log(`Condition ID: ${market.conditionId}`);
        // Only print per-market fields if they differ
        if (sharedTickSize == null) console.log(`Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
        if (sharedNegRisk == null) console.log(`Neg Risk: ${market.negRisk ?? "N/A"}`);
        if (sharedMinOrderSize == null) console.log(`Min Order Size: ${market.orderMinSize ?? "N/A"}`);
        if (sharedSpread == null) console.log(`Spread: ${market.spread ?? "N/A"}`);

        if (market.tokens && market.tokens.length > 0) {
            for (const token of market.tokens) {
                console.log(`  - ${token.outcome}: ${token.token_id}`);
            }
        }

        if (market.clobTokenIds) {
            let tokenIds: string[] = [];
            const clobIds = market.clobTokenIds;
            if (Array.isArray(clobIds)) {
                tokenIds = clobIds;
            } else if (typeof clobIds === "string") {
                try { tokenIds = JSON.parse(clobIds); } catch { tokenIds = clobIds.split(","); }
            }
            console.log(`\nCLOB Token IDs (用于下单):`);
            tokenIds.forEach((id, i) => console.log(`  [${i}] ${id}`));
        }
        console.log("---");
    }
}

// CLI entry
const input = process.argv[2];

if (!input) {
    console.error("用法: bun run scripts/getTokenId.ts <event_url|slug>");
    console.error("示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down");
    console.error("      bun run scripts/getTokenId.ts bitcoin-up-or-down");
    process.exit(1);
}

getTokenIdFromEventUrl(input).catch(console.error);
