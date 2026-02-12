// ========================
// 共享配置模块
// ========================
//
// 鉴权模式: 使用 createOrDeriveApiKey() 每次自动派生 API 凭证
// 只需要 PRIVATE_KEY 和 FUNDER_ADDRESS，无需手动管理 API key/secret/passphrase
//
// ⚠️ 双 ethers 版本说明:
//   - ethers v6: 用于链上交互 (JsonRpcProvider, Contract, 签名, Gnosis Safe 等)
//   - @ethersproject/wallet v5: 仅用于 ClobClient 签名 (SDK 内部硬依赖 v5 Wallet)

import { ClobClient, Side, OrderType, AssetType, TickSize } from "@polymarket/clob-client";
import { Wallet as Wallet5 } from "@ethersproject/wallet";  // v5 Wallet, 仅给 CLOB SDK 用
import { ethers } from "ethers";  // v6

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FUNDER_ADDRESS = process.env.FUNDER_ADDRESS;
const POLYGON_RPC = process.env.POLYGON_RPC || "https://polygon-rpc.com";
const CLOB_HOST = process.env.CLOB_HOST || "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

// Gamma API 地址
const GAMMA_API_HOST = "https://gamma-api.polymarket.com";

// 合约地址
const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// 2 = EOA 签名类型
const SIGNATURE_TYPE = 2;

if (!PRIVATE_KEY) {
    console.error("❌ 错误: 请在 .env 文件中设置 PRIVATE_KEY");
    console.error("   示例: PRIVATE_KEY=your_wallet_private_key_here");
    process.exit(1);
}

if (!FUNDER_ADDRESS) {
    console.error("❌ 错误: 请在 .env 文件中设置 FUNDER_ADDRESS");
    console.error("   FUNDER_ADDRESS 是你的 Polymarket proxy wallet 地址 (Gnosis Safe)");
    console.error("   可在 https://polymarket.com 个人设置页获取");
    process.exit(1);
}

// 创建 ethers v6 provider 和 wallet (链上交互用)
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 创建 v5 signer (仅给 ClobClient 用)
const signer = new Wallet5(PRIVATE_KEY);

// 创建已认证的 ClobClient (自动派生 API 凭证)
async function getClobClient(): Promise<ClobClient> {
    const creds = await new ClobClient(CLOB_HOST, CHAIN_ID, signer).createOrDeriveApiKey();
    return new ClobClient(CLOB_HOST, CHAIN_ID, signer, creds, SIGNATURE_TYPE, FUNDER_ADDRESS);
}

export {
    getClobClient,
    provider,
    wallet,
    signer,
    POLYGON_RPC,
    CLOB_HOST,
    CHAIN_ID,
    GAMMA_API_HOST,
    USDC_E_ADDRESS,
    FUNDER_ADDRESS,
    Side,
    OrderType,
    AssetType,
    TickSize,
    ethers,
};
