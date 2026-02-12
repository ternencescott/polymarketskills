// 查看订单簿
// 用法: bun run scripts/orderbook.ts <token_id>

import { getClobClient } from "./config";

async function getOrderbook(tokenId: string): Promise<void> {
    const client = await getClobClient();
    console.log("📗 查询 Orderbook...\n");

    const orderbook = await client.getOrderBook(tokenId);

    console.log("--- 买单 (Bids) ---");
    if (orderbook.bids && orderbook.bids.length > 0) {
        console.log("价格\t\t数量");
        orderbook.bids.slice(0, 10).forEach((bid: any) => {
            console.log(`$${bid.price}\t\t${bid.size}`);
        });
        if (orderbook.bids.length > 10) {
            console.log(`... 还有 ${orderbook.bids.length - 10} 条`);
        }
    } else {
        console.log("无买单");
    }

    console.log("\n--- 卖单 (Asks) ---");
    if (orderbook.asks && orderbook.asks.length > 0) {
        console.log("价格\t\t数量");
        orderbook.asks.slice(0, 10).forEach((ask: any) => {
            console.log(`$${ask.price}\t\t${ask.size}`);
        });
        if (orderbook.asks.length > 10) {
            console.log(`... 还有 ${orderbook.asks.length - 10} 条`);
        }
    } else {
        console.log("无卖单");
    }

    // 计算市场摘要
    if (orderbook.bids?.length > 0 && orderbook.asks?.length > 0) {
        const bestBid = parseFloat(orderbook.bids[0].price);
        const bestAsk = parseFloat(orderbook.asks[0].price);
        const spread = bestAsk - bestBid;
        const midPrice = (bestBid + bestAsk) / 2;

        console.log("\n--- 市场摘要 ---");
        console.log(`最高买价 (Best Bid): $${bestBid}`);
        console.log(`最低卖价 (Best Ask): $${bestAsk}`);
        console.log(`价差 (Spread): $${spread.toFixed(4)}`);
        console.log(`中间价 (Mid Price): $${midPrice.toFixed(4)}`);
    }
}

// CLI entry
const tokenId = process.argv[2];
if (!tokenId) {
    console.error("用法: bun run scripts/orderbook.ts <token_id>");
    process.exit(1);
}

getOrderbook(tokenId).catch(console.error);
