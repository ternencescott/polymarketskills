// 获取市场价格
// 用法: bun run scripts/price-info.ts <token_id>
//
// CLOB API 价格端点:
//   GET /price?side=SELL&token_id=<ID>  → ASK 价格 (即时买入价)
//   GET /price?side=BUY&token_id=<ID>   → BID 价格 (即时卖出价)
//   GET /midpoint?token_id=<ID>         → 中间价 (仅参考)

import { CLOB_HOST } from "./config";

export async function getPriceInfo(tokenID: string): Promise<void> {
    console.log("📈 获取市场价格...\n");

    const askRes = await fetch(`${CLOB_HOST}/price?side=SELL&token_id=${tokenID}`);
    const { price: askPrice } = await askRes.json() as any;
    const ask = parseFloat(askPrice);

    const bidRes = await fetch(`${CLOB_HOST}/price?side=BUY&token_id=${tokenID}`);
    const { price: bidPrice } = await bidRes.json() as any;
    const bid = parseFloat(bidPrice);

    const midRes = await fetch(`${CLOB_HOST}/midpoint?token_id=${tokenID}`);
    const { mid } = await midRes.json() as any;
    const midpoint = parseFloat(mid);

    console.log(`  ASK (即时买入): ${(ask * 100).toFixed(1)}¢ ($${ask.toFixed(3)})`);
    console.log(`  BID (即时卖出): ${(bid * 100).toFixed(1)}¢ ($${bid.toFixed(3)})`);
    console.log(`  Midpoint:       ${(midpoint * 100).toFixed(1)}¢ ($${midpoint.toFixed(3)})`);
    console.log(`  Spread:         ${((ask - bid) * 100).toFixed(1)}¢`);
}

// CLI entry
if (import.meta.main) {
    const tokenId = process.argv[2];
    if (!tokenId) {
        console.error("用法: bun run scripts/price-info.ts <token_id>");
        process.exit(1);
    }
    getPriceInfo(tokenId).catch(console.error);
}
