// 查看活跃订单
// 用法:
//   bun run scripts/check-orders.ts                    # 查看所有订单
//   bun run scripts/check-orders.ts --market <ID>      # 按市场过滤
//   bun run scripts/check-orders.ts --token <ID>       # 按 token 过滤

import { getClobClient } from "./config";

async function checkOrders(tokenId?: string): Promise<void> {
    const client = await getClobClient();
    const orders = tokenId
        ? await client.getOpenOrders({ asset_id: tokenId })
        : await client.getOpenOrders();

    if (!orders || orders.length === 0) {
        console.log("📭 没有活跃订单");
        return;
    }

    console.log(`找到 ${orders.length} 个活跃订单\n`);

    for (let i = 0; i < orders.length; i++) {
        const o = orders[i] as any;
        console.log(`${i + 1}. Order ID: ${o.id}`);
        console.log(`   Side: ${o.side}, Type: ${o.order_type || "GTC"}`);
        console.log(`   Price: ${(parseFloat(o.price) * 100).toFixed(1)}¢`);
        console.log(`   Size: ${o.original_size} shares, Matched: ${o.size_matched || "0"}`);
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

// CLI entry - parse args
let tokenId: string | undefined;
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--token" || args[i] === "--market") && args[i + 1]) {
        tokenId = args[i + 1];
        i++;
    }
}

checkOrders(tokenId).catch(console.error);
