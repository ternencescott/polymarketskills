// 从 Event URL 获取 tokenId
// 用法: bun run scripts/getTokenId.ts <event_url>
// 示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

async function getTokenIdFromEventUrl(eventUrl: string): Promise<void> {
    const urlObj = new URL(eventUrl);
    const pathParts = urlObj.pathname.split("/");
    const eventSlug = pathParts[pathParts.length - 1];
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
    console.log(`\nEvent Title: ${event.title}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`\n--- Markets & Token IDs ---\n`);

    for (const market of event.markets) {
        console.log(`Market: ${market.question}`);
        console.log(`Market ID: ${market.id}`);
        console.log(`Condition ID: ${market.conditionId}`);
        console.log(`Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
        console.log(`Neg Risk: ${market.negRisk ?? "N/A"}`);
        console.log(`Min Order Size: ${market.orderMinSize ?? "N/A"}`);
        console.log(`Spread: ${market.spread ?? "N/A"}`);

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
const eventUrl = process.argv[2];

if (!eventUrl) {
    console.error("用法: bun run scripts/getTokenId.ts <event_url>");
    console.error("示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down");
    process.exit(1);
}

getTokenIdFromEventUrl(eventUrl).catch(console.error);
