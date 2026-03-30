// 检查余额
// 用法: bun run scripts/check-balance.ts

import { getClobClient, provider,USDC_E_ADDRESS, AssetType, ethers } from "./config";

const USDC_E_ABI = [
    "function balanceOf(address) view returns (uint256)",
];

async function checkBalance(): Promise<void> {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const FUNDER_ADDRESS = process.env.FUNDER_ADDRESS;
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log("=".repeat(60));
    console.log("Polymarket 余额检查");
    console.log("=".repeat(60));
    console.log("\n钱包地址:", wallet.address);
    console.log("Funder (Proxy Wallet):", FUNDER_ADDRESS);
    console.log("Profile: https://polymarket.com/profile/" + wallet.address);

    // USDC.e 余额 (查询 FUNDER_ADDRESS, ethers v6 Contract)
    const usdcContract = new ethers.Contract(USDC_E_ADDRESS, USDC_E_ABI, provider);
    const usdcBal = await usdcContract.balanceOf(FUNDER_ADDRESS);
    const usdc = parseFloat(ethers.formatUnits(usdcBal, 6));
    console.log("💰 USDC.e: $" + usdc.toFixed(2), usdc >= 5 ? "✅" : "⚠️ 需要 >= $5");

    // CLOB 内部余额 (通过 API)
    const client = await getClobClient();
    const collateral = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    console.log("\n📊 CLOB 余额信息:");
    console.log(JSON.stringify(collateral, null, 2));
}

checkBalance().catch(console.error);
