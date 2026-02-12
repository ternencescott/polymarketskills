// 卖出下单
// 用法: bun run scripts/sell.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]
//
// ⚠️ --size 参数含义不同:
//   MARKET 订单 (--type market): size = 收到的美元金额
//   LIMIT 订单  (--type limit):  size = 卖出的 share 数量

import { getClobClient, Side, OrderType, TickSize } from "./config";
import { getPriceInfo } from "./price-info";

async function sellOrder(
    tokenID: string, price: number, size: number,
    orderType: string = "limit",
    tickSize: string = "0.01",
    negRisk: boolean = false,
): Promise<void> {
    const client = await getClobClient();

    await getPriceInfo(tokenID);

    let response: any;
    if (orderType === "market") {
        console.log(`\n📤 市价卖出: $${size} worth...`);
        const order = await client.createMarketOrder({
            side: Side.SELL,
            tokenID,
            amount: size,
            price,
        });
        response = await client.postOrder(order, OrderType.FOK);
    } else {
        console.log(`\n📤 限价卖出: ${size} shares @ $${price}...`);
        response = await client.createAndPostOrder(
            { tokenID, price, size, side: Side.SELL },
            { tickSize: tickSize as TickSize, negRisk },
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
    console.error("用法: bun run scripts/sell.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]");
    process.exit(1);
}

sellOrder(tokenID, price, size, orderType, tickSize, negRisk).catch(console.error);
