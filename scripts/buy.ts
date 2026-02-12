// 买入下单
// 用法: bun run scripts/buy.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]
//
// ⚠️ --size 参数含义不同:
//   MARKET 订单 (--type market): size = 花费的美元金额
//   LIMIT 订单  (--type limit):  size = 购买的 share 数量

import { getClobClient, AssetType, Side, OrderType } from "./config";
import { getPriceInfo } from "./price-info";

async function buyOrder(
    tokenID: string, price: number, size: number,
    orderType: string = "limit",
    tickSize: string = "0.01",
    negRisk: boolean = false,
): Promise<void> {
    const client = await getClobClient();

    // 余额检查
    const balance = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    const balanceUsd = parseFloat((balance as any).balance) / 1000000;
    const required = orderType === "market" ? size : price * size;
    console.log(`余额: $${balanceUsd.toFixed(2)}, 需要: $${required.toFixed(2)}`);
    if (balanceUsd < required) {
        console.error("❌ 余额不足!");
        return;
    }

    // 获取价格参考
    await getPriceInfo(tokenID);

    // 下单
    let response: any;
    if (orderType === "market") {
        console.log(`\n📤 市价买入: 花费 $${size}...`);
        const order = await client.createMarketOrder({
            side: Side.BUY,
            tokenID,
            amount: size,
            price,
        });
        response = await client.postOrder(order, OrderType.FOK);
    } else {
        console.log(`\n📤 限价买入: ${size} shares @ $${price}...`);
        response = await client.createAndPostOrder(
            { tokenID, price, size, side: Side.BUY },
            { tickSize: tickSize as any, negRisk },
            OrderType.GTC,
        );
    }

    console.log("✅ 订单已提交:", response.orderID);
    console.log("   Status:", response.status || response.errorMsg);
}

// CLI entry - parse args
const args = process.argv.slice(2);
let tokenID = "";
let price = 0;
let size = 0;
let orderType = "limit";
let tickSize = "0.01";
let negRisk = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case "--token": tokenID = args[++i]; break;
        case "--price": price = parseFloat(args[++i]); break;
        case "--size": size = parseFloat(args[++i]); break;
        case "--type": orderType = args[++i]; break;
        case "--tick": tickSize = args[++i]; break;
        case "--neg-risk": negRisk = true; break;
    }
}

if (!tokenID || !price || !size) {
    console.error("用法: bun run scripts/buy.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]");
    process.exit(1);
}

buyOrder(tokenID, price, size, orderType, tickSize, negRisk).catch(console.error);
