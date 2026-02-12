// 查看订单簿
// 用法: bun run scripts/orderbook.ts <token_id>

import { getClobClient } from "./config";

async function getOrderbook(tokenId: string): Promise<void> {
    const client = await getClobClient();
    console.log("📗 查询 Orderbook...\n");

    const orderbook = await client.getOrderBook(tokenId);

    // 排序：Bids 从高到低（最高买价在盘口），Asks 从低到高（最低卖价在盘口）
    const sortedBids = [...(orderbook.bids || [])].sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
    const sortedAsks = [...(orderbook.asks || [])].sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));

    console.log("--- 买单 (Bids) · 从高到低 ---");
    if (sortedBids.length > 0) {
        console.log("价格\t\t数量");
        sortedBids.slice(0, 10).forEach((bid: any) => {
            console.log(`$${bid.price}\t\t${bid.size}`);
        });
        if (sortedBids.length > 10) {
            console.log(`... 还有 ${sortedBids.length - 10} 条`);
        }
    } else {
        console.log("无买单");
    }

    console.log("\n--- 卖单 (Asks) · 从低到高 ---");
    if (sortedAsks.length > 0) {
        console.log("价格\t\t数量");
        sortedAsks.slice(0, 10).forEach((ask: any) => {
            console.log(`$${ask.price}\t\t${ask.size}`);
        });
        if (sortedAsks.length > 10) {
            console.log(`... 还有 ${sortedAsks.length - 10} 条`);
        }
    } else {
        console.log("无卖单");
    }

    // 计算市场摘要
    if (sortedBids.length > 0 && sortedAsks.length > 0) {
        const bestBid = parseFloat(sortedBids[0].price);
        const bestAsk = parseFloat(sortedAsks[0].price);
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
