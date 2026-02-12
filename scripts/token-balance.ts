// 查看特定 Token 持仓
// 用法: bun run scripts/token-balance.ts <token_id>

import { getClobClient, AssetType } from "./config";

async function getTokenBalance(tokenId: string): Promise<void> {
    const client = await getClobClient();
    console.log(`📊 查询 Token 持仓: ${tokenId}\n`);

    const positions = await client.getBalanceAllowance({
        asset_type: AssetType.CONDITIONAL,
        token_id: tokenId,
    });

    console.log("Token 持仓信息:");
    console.log(JSON.stringify(positions, null, 2));
}

// CLI entry
const tokenId = process.argv[2];
if (!tokenId) {
    console.error("用法: bun run scripts/token-balance.ts <token_id>");
    process.exit(1);
}

getTokenBalance(tokenId).catch(console.error);
