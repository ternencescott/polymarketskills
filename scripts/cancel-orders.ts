// 取消订单
// 用法:
//   bun run scripts/cancel-orders.ts --order <ORDER_ID>    # 取消单个订单
//   bun run scripts/cancel-orders.ts --market <MARKET_ID>  # 取消某市场全部订单

import { getClobClient } from "./config";

async function cancelOrders(mode: "single" | "market", id: string): Promise<void> {
    const client = await getClobClient();
    let response: any;

    if (mode === "single") {
        console.log("🚫 取消订单:", id);
        response = await client.cancelOrder({ orderID: id });
    } else {
        console.log("🚫 取消市场订单:", id);
        response = await client.cancelMarketOrders({ market: id });
    }

    if (response?.canceled?.length > 0) {
        console.log(`✅ 已取消 ${response.canceled.length} 个订单`);
    }
    if (response?.not_canceled && Object.keys(response.not_canceled).length > 0) {
        console.log("⚠️ 取消失败:", response.not_canceled);
    }
}

// CLI entry - parse args
const args = process.argv.slice(2);
let mode: "single" | "market" | undefined;
let id: string | undefined;

for (let i = 0; i < args.length; i++) {
    if (args[i] === "--order" && args[i + 1]) {
        mode = "single";
        id = args[i + 1];
        i++;
    } else if (args[i] === "--market" && args[i + 1]) {
        mode = "market";
        id = args[i + 1];
        i++;
    }
}

if (!mode || !id) {
    console.error("用法:");
    console.error("  bun run scripts/cancel-orders.ts --order <ORDER_ID>");
    console.error("  bun run scripts/cancel-orders.ts --market <MARKET_ID>");
    process.exit(1);
}

cancelOrders(mode, id).catch(console.error);
