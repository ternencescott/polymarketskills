// ============================================================
// Polymarket CLOB Skills - 基于 bun 运行时
// ============================================================
//
// 前置条件:
//   1. 安装依赖:
//      bun add @polymarket/clob-client @ethersproject/wallet@^5.8.0 ethers@^6 axios
//      ⚠️ ethers v6 用于链上交互 (provider, Contract, 签名等)
//      ⚠️ @ethersproject/wallet v5 仅用于 CLOB SDK 签名 (SDK 内部依赖 v5 Wallet)
//   2. 创建 .env 文件并填入以下信息:
//      PRIVATE_KEY=<你的钱包私钥>
//      FUNDER_ADDRESS=<你的资金钱包地址 (Polymarket proxy wallet / Gnosis Safe)>
//
// ⚠️ 安全提醒:
//   - PRIVATE_KEY 是你的钱包私钥，拥有该私钥即拥有钱包完全控制权，切勿泄露
//   - FUNDER_ADDRESS 是你在 Polymarket 上的 proxy wallet 地址 (Gnosis Safe)
//     可在 https://polymarket.com 登录后，从个人设置页或浏览器控制台获取
//   - 请确保 .env 已加入 .gitignore，永远不要将私钥提交到版本控制
//
// 运行方式 (使用 bun):
//   bun run scripts/check-balance.ts                         # 1. 检查余额
//   bun run scripts/search.ts <keyword> [limit]              # 2. 搜索市场
//   bun run scripts/getTokenId.ts <event_url>                # 3. 获取 tokenId
//   bun run scripts/price-info.ts <token_id>                 # 4. 获取价格
//   bun run scripts/orderbook.ts <token_id>                  # 5. 查看订单簿
//   bun run scripts/buy.ts --token <ID> --price <P> --size <S> [--type market|limit]
//   bun run scripts/sell.ts --token <ID> --price <P> --size <S> [--type market|limit]
//   bun run scripts/check-orders.ts [--market <ID>] [--token <ID>]
//   bun run scripts/token-balance.ts <token_id>              # 查看特定 token 持仓
//   bun run scripts/cancel-orders.ts --order <ID> | --market <ID>
//
// ============================================================
// 新用户入门流程 (必须按顺序执行):
//   Step 1: 用户提供 PRIVATE_KEY 和 FUNDER_ADDRESS → 写入 .env
//   Step 2: bun run scripts/check-balance.ts → 确认有 USDC.e (>=$5)
//   Step 3: 开始交易!
// ============================================================


// ========================
// Part 1: 配置 (config.ts)
// ========================
//
// 鉴权模式: 使用 createOrDeriveApiKey() 每次自动派生 API 凭证
// 只需要 PRIVATE_KEY 和 FUNDER_ADDRESS，无需手动管理 API key/secret/passphrase
//
// ⚠️ 双 ethers 版本说明:
//   - ethers v6: 用于链上交互 (JsonRpcProvider, Contract, 签名, Gnosis Safe 等)
//   - @ethersproject/wallet v5: 仅用于 ClobClient 签名 (SDK 内部硬依赖 v5 Wallet)
//   两者可以共存，互不冲突

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


// ==============================================
// Part 2: 检查余额 (check-balance.ts)
// ==============================================
// 用法: bun run scripts/check-balance.ts
//
// 检查内容:
//   - USDC.e 链上余额 (查询 FUNDER_ADDRESS，即 Polymarket proxy wallet)
//     合约: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

const USDC_E_ABI = [
    "function balanceOf(address) view returns (uint256)",
];

async function checkBalance(): Promise<void> {
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


// ===================================
// Part 3: 搜索市场 (search.ts)
// ===================================
//
// Gamma API 搜索端点: GET https://gamma-api.polymarket.com/public-search
//
// 查询参数:
//   q                (string, 必填)  - 搜索关键词，如 "bitcoin", "election"
//   limit_per_type   (integer)       - 每种类型返回的结果数
//   page             (integer)       - 分页页码
//   events_status    (string)        - 事件状态过滤，如 "active", "closed"
//   events_tag       (string[])      - 按标签过滤，如 ["crypto", "politics"]
//   keep_closed_markets (integer)    - 是否包含已关闭市场 (1=包含, 0=不包含)
//   sort             (string)        - 排序字段，如 "volume", "liquidity"
//   ascending        (boolean)       - 排序方向 (true=升序, false=降序)
//   search_tags      (boolean)       - 是否搜索标签
//   search_profiles  (boolean)       - 是否搜索用户资料
//   recurrence       (string)        - 周期过滤
//   exclude_tag_id   (integer[])     - 排除指定标签 ID
//   optimized        (boolean)       - 优化标志
//   cache            (boolean)       - 缓存开关
//
// 响应格式:
// {
//   events: [{ id, title, slug, volume, liquidity, active,
//     markets: [{ id, question, conditionId, tokens, clobTokenIds, negRisk, ... }]
//   }],
//   tags: [{ id, label, slug, event_count }],
//   profiles: [{ id, name, profileImage, bio }],
//   pagination: { hasMore, totalResults }
// }
//
// 用法: bun run scripts/search.ts <keyword> [limit]
// 示例: bun run scripts/search.ts bitcoin 10

import axios from "axios";

async function searchMarkets(query: string, limit: number = 5): Promise<void> {
    console.log(`\n🔍 搜索: "${query}"\n`);

    const response = await axios.get(`${GAMMA_API_HOST}/public-search`, {
        params: {
            q: query,
            limit_per_type: limit,
            events_status: "active",
        },
    });

    const { events, tags } = response.data;

    if (!events || events.length === 0) {
        console.log("未找到匹配的事件");
        return;
    }

    for (const event of events) {
        console.log(`📌 ${event.title}`);
        console.log(`   Event ID: ${event.id}`);
        console.log(`   Volume: $${event.volume?.toLocaleString() ?? "N/A"}`);
        console.log(`   URL: https://polymarket.com/event/${event.slug}`);

        for (const market of event.markets) {
            console.log(`\n   Market: ${market.question}`);
            console.log(`   Market ID: ${market.id}`);
            console.log(`   Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
            console.log(`   Neg Risk: ${market.negRisk ?? "N/A"}`);

            if (market.tokens && market.tokens.length > 0) {
                for (const token of market.tokens) {
                    console.log(`     - ${token.outcome}: ${token.token_id}`);
                }
            }
        }
        console.log("---");
    }

    if (tags && tags.length > 0) {
        console.log("\n🏷️ 相关标签:");
        for (const tag of tags) {
            console.log(`   ${tag.label} (${tag.event_count} events)`);
        }
    }
}


// ============================================
// Part 4: 从 Event URL 获取 tokenId (getTokenId.ts)
// ============================================
// 用法: bun run scripts/getTokenId.ts <event_url>
// 示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down

async function getTokenIdFromEventUrl(eventUrl: string): Promise<void> {
    const urlObj = new URL(eventUrl);
    const pathParts = urlObj.pathname.split("/");
    const eventSlug = pathParts[pathParts.length - 1];
    console.log(`Event Slug: ${eventSlug}`);

    const response = await axios.get(`${GAMMA_API_HOST}/events`, {
        params: { slug: eventSlug },
    });

    const events = response.data;
    if (!events || events.length === 0) {
        console.log("未找到该 Event");
        return;
    }

    const event = events[0];
    console.log(`\nEvent Title: ${event.title}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`\n--- Markets & Token IDs ---\n`);

    for (const market of event.markets) {
        console.log(`Market: ${market.question}`);
        console.log(`Market ID: ${market.id}`);
        console.log(`Condition ID: ${market.conditionId}`);
        console.log(`Tick Size: ${market.orderPriceMinTickSize ?? "N/A"}`);
        console.log(`Neg Risk: ${market.negRisk ?? "N/A"}`);
        console.log(`Min Order Size: ${market.orderMinSize ?? "N/A"}`);
        console.log(`Spread: ${market.spread ?? "N/A"}`);

        if (market.tokens && market.tokens.length > 0) {
            for (const token of market.tokens) {
                console.log(`  - ${token.outcome}: ${token.token_id}`);
            }
        }

        if (market.clobTokenIds) {
            let tokenIds: string[] = [];
            const clobIds = market.clobTokenIds;
            if (Array.isArray(clobIds)) {
                tokenIds = clobIds;
            } else if (typeof clobIds === "string") {
                try { tokenIds = JSON.parse(clobIds); } catch { tokenIds = clobIds.split(","); }
            }
            console.log(`\nCLOB Token IDs (用于下单):`);
            tokenIds.forEach((id, i) => console.log(`  [${i}] ${id}`));
        }
        console.log("---");
    }
}


// ============================================
// Part 5: 获取市场价格 (price-info.ts)
// ============================================
//
// CLOB API 价格端点:
//   GET /price?side=SELL&token_id=<ID>  → ASK 价格 (即时买入价)
//   GET /price?side=BUY&token_id=<ID>   → BID 价格 (即时卖出价)
//   GET /midpoint?token_id=<ID>         → 中间价 (仅参考)
//
// 注意: side 指的是做市商的方向:
//   side=SELL → 做市商卖出 → 你买入的价格 (ASK)
//   side=BUY  → 做市商买入 → 你卖出的价格 (BID)
//
// 用法: bun run scripts/price-info.ts <token_id>

async function getPriceInfo(tokenID: string): Promise<void> {
    console.log("📈 获取市场价格...\n");

    const askRes = await fetch(`${CLOB_HOST}/price?side=SELL&token_id=${tokenID}`);
    const { price: askPrice } = await askRes.json();
    const ask = parseFloat(askPrice);

    const bidRes = await fetch(`${CLOB_HOST}/price?side=BUY&token_id=${tokenID}`);
    const { price: bidPrice } = await bidRes.json();
    const bid = parseFloat(bidPrice);

    const midRes = await fetch(`${CLOB_HOST}/midpoint?token_id=${tokenID}`);
    const { mid } = await midRes.json();
    const midpoint = parseFloat(mid);

    console.log(`  ASK (即时买入): ${(ask * 100).toFixed(1)}¢ ($${ask.toFixed(3)})`);
    console.log(`  BID (即时卖出): ${(bid * 100).toFixed(1)}¢ ($${bid.toFixed(3)})`);
    console.log(`  Midpoint:       ${(midpoint * 100).toFixed(1)}¢ ($${midpoint.toFixed(3)})`);
    console.log(`  Spread:         ${((ask - bid) * 100).toFixed(1)}¢`);
}


// ============================================
// Part 6: 买入下单 (buy.ts)
// ============================================
//
// ⚠️ --size 参数含义不同:
//   MARKET 订单 (--type market): size = 花费的美元金额
//     例: --size 100 → 花费 $100，获得 ~200 shares (按 $0.50/share)
//   LIMIT 订单  (--type limit):  size = 购买的 share 数量
//     例: --size 100 → 买 100 shares，花费 = 100 × price
//
// 最小订单:
//   Market: > $1.00
//   Limit:  >= 5 shares 且总价值 > $1.00
//
// ⚠️ createAndPostOrder 需要 3 个参数:
//   参数1: { tokenID, price, size, side }            - 订单参数
//   参数2: { tickSize, negRisk }                     - 市场选项 (从 Gamma API 获取)
//   参数3: OrderType.GTC                              - 订单类型
//
// 用法: bun run scripts/buy.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]

async function buyOrder(
    tokenID: string, price: number, size: number,
    orderType: string = "limit",
    tickSize: string = "0.01",   // 从 Gamma API 的 orderPriceMinTickSize 获取
    negRisk: boolean = false,     // 从 Gamma API 的 negRisk 字段获取
): Promise<void> {
    const client = await getClobClient();

    // 余额检查
    const balance = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    const balanceUsd = parseFloat(balance.balance) / 1000000;
    const required = orderType === "market" ? size : price * size;
    console.log(`余额: $${balanceUsd.toFixed(2)}, 需要: $${required.toFixed(2)}`);
    if (balanceUsd < required) {
        console.error("❌ 余额不足!");
        return;
    }

    // 获取价格参考
    await getPriceInfo(tokenID);

    // 下单
    let response;
    if (orderType === "market") {
        // Market order (FOK - Fill or Kill)
        // size = 美元金额
        console.log(`\n📤 市价买入: 花费 $${size}...`);
        const order = await client.createMarketOrder({
            side: Side.BUY,
            tokenID,
            amount: size,
            price,
        });
        response = await client.postOrder(order, OrderType.FOK);
    } else {
        // Limit order (GTC - Good Till Cancelled)
        // size = share 数量
        console.log(`\n📤 限价买入: ${size} shares @ $${price}...`);
        response = await client.createAndPostOrder(
            { tokenID, price, size, side: Side.BUY },
            { tickSize: tickSize as TickSize, negRisk },
            OrderType.GTC,
        );
    }

    console.log("✅ 订单已提交:", response.orderID);
    console.log("   Status:", response.status || response.errorMsg);
}


// ============================================
// Part 7: 卖出下单 (sell.ts)
// ============================================
//
// ⚠️ --size 参数含义不同:
//   MARKET 订单 (--type market): size = 收到的美元金额
//   LIMIT 订单  (--type limit):  size = 卖出的 share 数量
//
// 用法: bun run scripts/sell.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]

async function sellOrder(
    tokenID: string, price: number, size: number,
    orderType: string = "limit",
    tickSize: string = "0.01",
    negRisk: boolean = false,
): Promise<void> {
    const client = await getClobClient();

    await getPriceInfo(tokenID);

    let response;
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


// ============================================
// Part 8: 查看活跃订单 (check-orders.ts)
// ============================================
//
// 用法:
//   bun run scripts/check-orders.ts                    # 查看所有订单
//   bun run scripts/check-orders.ts --market <ID>      # 按市场过滤
//   bun run scripts/check-orders.ts --token <ID>       # 按 token 过滤 (asset_id)

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
        const o = orders[i];
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

    const buys = orders.filter(o => o.side === "BUY").length;
    const sells = orders.filter(o => o.side === "SELL").length;
    console.log(`📈 Buy: ${buys}, 📉 Sell: ${sells}`);
}


// ============================================
// Part 9: 取消订单 (cancel-orders.ts)
// ============================================
//
// 用法:
//   bun run scripts/cancel-orders.ts --order <ORDER_ID>   # 取消单个订单
//   bun run scripts/cancel-orders.ts --market <MARKET_ID>  # 取消某市场全部订单

async function cancelOrders(mode: "single" | "market", id?: string): Promise<void> {
    const client = await getClobClient();
    let response;

    if (mode === "single" && id) {
        console.log("🚫 取消订单:", id);
        response = await client.cancelOrder({ orderID: id });
    } else if (mode === "market" && id) {
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


// ============================================
// Part 10: negRisk 概念详解
// ============================================
//
// negRisk (Negative Risk) 是 Polymarket 的市场类型标识:
//
// negRisk: false (标准二元市场)
//   - 普通的 YES/NO 预测市场
//   - 例如: "BTC 今天会涨吗?"
//   - YES + NO 概率 = 100%
//   - 两个 token: YES token + NO token
//
// negRisk: true (负风险市场 / 多选市场)
//   - 用于多个互斥选项的市场
//   - 例如: "谁会赢得总统大选?" (有多个候选人)
//   - 每个选项独立定价，概率总和可能 ≠ 100%
//   - 允许"负风险"套利策略
//   - 做市商可能在某些情况下获得"负风险"敞口
//
// 如何确定市场的 negRisk 值?
//   - 通过 Gamma API 查询: GET /events?slug={slug}
//   - 响应中每个 market 的 negRisk 字段
//   - 也可从 getTokenId 脚本输出中获取
//
// ⚠️ 下单时必须正确传入 negRisk，否则订单可能失败!
//    client.createAndPostOrder(orderParams, { tickSize, negRisk }, OrderType.GTC)


// ============================================
// Part 11: 查看订单簿 (orderbook.ts)
// ============================================
//
// 用法: bun run scripts/orderbook.ts <token_id>
//
// 获取市场的完整订单簿 (bids + asks)，计算 spread 和中间价
// 使用 SDK 方法: client.getOrderBook(tokenId)

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


// ============================================
// Part 12: 查看特定 Token 持仓 (token-balance.ts)
// ============================================
//
// 用法: bun run scripts/token-balance.ts <token_id>
//
// 查询你在某个预测市场中持有的 shares 数量
// 使用 CONDITIONAL 资产类型 + token_id

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


// ============================================
// Part 13: 订单类型参考
// ============================================
//
// | 类型 | 全称               | 行为                                   |
// |------|--------------------|----------------------------------------|
// | FOK  | Fill or Kill       | 市价单 - 必须全部成交否则取消           |
// | FAK  | Fill and Kill      | 市价单 - 尽可能成交，剩余取消           |
// | GTC  | Good Till Cancelled| 限价单 - 挂单直到成交或手动取消         |
// | GTD  | Good Till Date     | 限价单 - 挂单到指定时间自动过期         |
//
// 价格必须使用 0.001 递增 (如 0.500, 0.501, 不能用 0.5001)


// ============================================
// Part 15: 错误码参考
// ============================================
//
// | 错误码                              | 说明                    | 解决方案                        |
// |--------------------------------------|-------------------------|--------------------------------|
// | INVALID_ORDER_MIN_TICK_SIZE          | 价格不符合精度要求       | 使用 0.001 递增                |
// | INVALID_ORDER_MIN_SIZE              | 订单 size 太小           | 增加 size                      |
// | INVALID_ORDER_NOT_ENOUGH_BALANCE    | 余额不足                | 充值 USDC                      |
// | INVALID_ORDER_DUPLICATED            | 重复订单                | 先取消已有订单                  |
// | FOK_ORDER_NOT_FILLED_ERROR          | FOK 无法全部成交        | 改用 FAK 或减小 size            |
// | INVALID_POST_ONLY_ORDER             | Post-only 会立即成交    | 调整价格不要穿越 spread         |
// | MARKET_NOT_READY                    | 市场暂不接受订单         | 等待或换市场                    |


// ============================================
// Part 16: SDK 方法速查
// ============================================
//
// --- 订单操作 ---
// client.createAndPostOrder(params, options, orderType)
//   params:    { tokenID, price, size, side }
//   options:   { tickSize: "0.01"|"0.001", negRisk: boolean }
//   orderType: OrderType.GTC | OrderType.FOK | OrderType.GTD
// client.createMarketOrder(params)            → 创建市价单
// client.postOrder(order, orderType)          → 提交订单
//
// --- 订单查询 ---
// client.getOpenOrders(params?)               → 获取活跃订单 (可传 { asset_id } 按 token 过滤)
// client.getOrder(orderID)                    → 获取单个订单详情
// client.getOrderBook(tokenID)               → 获取订单簿 (bids + asks)
//
// --- 取消订单 ---
// client.cancelOrder({ orderID })             → 取消单个订单
// client.cancelMarketOrders({ market })       → 取消某市场全部订单
//
// --- 账户信息 ---
// client.getBalanceAllowance({ asset_type })  → 查询余额和授权额度
//   asset_type: AssetType.COLLATERAL (USDC) | AssetType.CONDITIONAL (预测 token)
//   查 CONDITIONAL 时需传 token_id: client.getBalanceAllowance({ asset_type: "CONDITIONAL", token_id })
// client.getPositions()                       → 查询持仓
// client.getApiKeys()                         → 查询 API 密钥
//
// --- 凭证 ---
// client.createOrDeriveApiKey()               → 生成/获取 API 凭证


// ============================================
// Part 17: CLOB API 端点速查
// ============================================
//
// Base URL: https://clob.polymarket.com
//
// --- 订单 ---
// POST   /order              → 提交单个订单
// DELETE /order              → 取消单个订单
// DELETE /cancel-market-orders → 取消某市场订单
//
// --- 市场数据 ---
// GET /midpoint?token_id=<ID>              → 中间价
// GET /price?side=BUY|SELL&token_id=<ID>   → 市场价格
// GET /book?token_id=<ID>                  → 订单簿 (bids + asks)
//
// --- 订单查询 ---
// GET /data/orders?market=<ID>             → 按市场查询订单
// GET /data/order/<order_id>               → 查询单个订单
//
// --- 账户 ---
// GET /balance?asset_type=COLLATERAL       → 余额和授权
// GET /positions                           → 持仓

