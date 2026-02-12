// ============================================================
// Polymarket CLOB Skills - 基于 bun 运行时
// ============================================================
//
// 前置条件:
//   0. 安装 bun 运行时 (如已安装则跳过):
//      command -v bun >/dev/null 2>&1 && echo "bun 已安装: $(bun --version)" || { curl -fsSL https://bun.sh/install | bash && source ~/.bashrc; }
//   1. 创建 .env 文件并填入以下信息:
//      PRIVATE_KEY=<你的钱包私钥>
//      FUNDER_ADDRESS=<你的资金钱包地址 (Polymarket proxy wallet / Gnosis Safe)>
//
// ⚠️ 无需手动安装依赖:
//   bun 具备 auto-install 能力 — 当 package.json 中声明了依赖但 node_modules 中缺失时，
//   bun run 会在首次执行时自动安装，无需手动 bun add / bun install。
//   类似 npx/bunx 的零配置体验，但作用于 import 级别。
//   依赖版本由 package.json 和 bun.lock 锁定，确保一致性。
//
// ⚠️ 安全提醒:
//   - PRIVATE_KEY 是你的钱包私钥，拥有该私钥即拥有钱包完全控制权，切勿泄露
//   - FUNDER_ADDRESS 是你在 Polymarket 上的 proxy wallet 地址 (Gnosis Safe)
//     可在 https://polymarket.com 登录后，从个人设置页或浏览器控制台获取
//   - 请确保 .env 已加入 .gitignore，永远不要将私钥提交到版本控制
//
// ============================================================
// ⚠️ 用户必须先在 Polymarket 网站上完成以下步骤，才能使用本 Skills:
//
//   Step 0: 注册账户
//     - 前往 https://polymarket.com 注册并登录
//     - 支持钱包登录 (MetaMask 等) 或邮箱注册
//
//   Step 1: Enable Trading (启用交易)
//     - 登录后点击 "Enable Trading" 按钮
//     - 这一步会在链上创建你的 Polymarket proxy wallet (Gnosis Safe)
//     - 完成后你才会获得 FUNDER_ADDRESS (即 proxy wallet 地址)
//     - 同时需要完成 USDC 授权 (Approve)，授权后才能下单
//
//   Step 2: 充值 USDC
//     - 向你的 Polymarket 账户充值 USDC (建议 >= $5)
//     - 支持从 Polygon 链直接充值，或通过跨链桥从其他链转入
//     - 充值到的是你的 proxy wallet (FUNDER_ADDRESS)
//
//   以上步骤全部完成后，你会拥有:
//     - PRIVATE_KEY: 你的钱包私钥 (登录钱包的那个)
//     - FUNDER_ADDRESS: Polymarket 为你创建的 proxy wallet 地址
//     将这两个值填入 .env 即可开始使用本 Skills
//
// ============================================================
// 入门流程 (网站步骤完成后):
//   Step 1: 用户提供 PRIVATE_KEY 和 FUNDER_ADDRESS → 写入 .env
//   Step 2: bun run scripts/check-balance.ts → 确认有 USDC.e (>=$5)
//   Step 3: 开始交易!
// ============================================================


// ============================================================
// 脚本命令速查
// ============================================================
//
//   bun run scripts/check-balance.ts                         # 1. 检查余额
//   bun run scripts/search.ts <keyword> [limit]              # 2. 搜索市场
//   bun run scripts/getTokenId.ts <event_url>                # 3. 获取 tokenId
//   bun run scripts/price-info.ts <token_id>                 # 4. 获取价格
//   bun run scripts/orderbook.ts <token_id>                  # 5. 查看订单簿
//   bun run scripts/buy.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
//   bun run scripts/sell.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
//   bun run scripts/check-orders.ts [--market <ID>] [--token <ID>]
//   bun run scripts/token-balance.ts <token_id>              # 查看特定 token 持仓
//   bun run scripts/cancel-orders.ts --order <ID> | --market <ID>


// ============================================================
// 配置说明 (scripts/config.ts)
// ============================================================
//
// 鉴权模式: 使用 createOrDeriveApiKey() 每次自动派生 API 凭证
// 只需要 PRIVATE_KEY 和 FUNDER_ADDRESS，无需手动管理 API key/secret/passphrase
//
// ⚠️ 双 ethers 版本说明:
//   - ethers v6: 用于链上交互 (JsonRpcProvider, Contract, 签名, Gnosis Safe 等)
//   - @ethersproject/wallet v5: 仅用于 ClobClient 签名 (SDK 内部硬依赖 v5 Wallet)
//   两者可以共存，互不冲突


// ============================================================
// 各脚本用法详解
// ============================================================
//
// --- 1. 检查余额 (scripts/check-balance.ts) ---
//   bun run scripts/check-balance.ts
//   检查内容:
//     - USDC.e 链上余额 (查询 FUNDER_ADDRESS，即 Polymarket proxy wallet)
//       合约: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
//     - CLOB 内部余额 (通过 API)
//
// --- 2. 搜索市场 (scripts/search.ts) ---
//   bun run scripts/search.ts <keyword> [limit]
//   示例: bun run scripts/search.ts bitcoin 10
//
//   Gamma API 搜索端点: GET https://gamma-api.polymarket.com/public-search
//   查询参数:
//     q                (string, 必填)  - 搜索关键词
//     limit_per_type   (integer)       - 每种类型返回的结果数
//     events_status    (string)        - 事件状态过滤，如 "active", "closed"
//     events_tag       (string[])      - 按标签过滤
//     sort             (string)        - 排序字段，如 "volume", "liquidity"
//     ascending        (boolean)       - 排序方向
//
//   响应格式:
//   {
//     events: [{ id, title, slug, volume, liquidity, active,
//       markets: [{ id, question, conditionId, tokens, clobTokenIds, negRisk, ... }]
//     }],
//     tags: [{ id, label, slug, event_count }],
//     profiles: [{ id, name, profileImage, bio }],
//     pagination: { hasMore, totalResults }
//   }
//
// --- 3. 从 Event URL 获取 tokenId (scripts/getTokenId.ts) ---
//   bun run scripts/getTokenId.ts <event_url>
//   示例: bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down
//
// --- 4. 获取市场价格 (scripts/price-info.ts) ---
//   bun run scripts/price-info.ts <token_id>
//
//   CLOB API 价格端点:
//     GET /price?side=SELL&token_id=<ID>  → ASK 价格 (即时买入价)
//     GET /price?side=BUY&token_id=<ID>   → BID 价格 (即时卖出价)
//     GET /midpoint?token_id=<ID>         → 中间价 (仅参考)
//
//   注意: side 指的是做市商的方向:
//     side=SELL → 做市商卖出 → 你买入的价格 (ASK)
//     side=BUY  → 做市商买入 → 你卖出的价格 (BID)
//
// --- 5. 查看订单簿 (scripts/orderbook.ts) ---
//   bun run scripts/orderbook.ts <token_id>
//   获取市场的完整订单簿 (bids + asks)，计算 spread 和中间价
//
// --- 6. 买入下单 (scripts/buy.ts) ---
//   bun run scripts/buy.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]
//
//   ⚠️ --size 参数含义不同:
//     MARKET 订单 (--type market): size = 花费的美元金额
//       例: --size 100 → 花费 $100，获得 ~200 shares (按 $0.50/share)
//     LIMIT 订单  (--type limit):  size = 购买的 share 数量
//       例: --size 100 → 买 100 shares，花费 = 100 × price
//
//   最小订单:
//     Market: > $1.00
//     Limit:  >= 5 shares 且总价值 > $1.00
//
// --- 7. 卖出下单 (scripts/sell.ts) ---
//   bun run scripts/sell.ts --token <TOKEN_ID> --price <PRICE> --size <SIZE> [--type market|limit] [--tick 0.01] [--neg-risk]
//
//   ⚠️ --size 参数含义不同:
//     MARKET 订单 (--type market): size = 收到的美元金额
//     LIMIT 订单  (--type limit):  size = 卖出的 share 数量
//
// --- 8. 查看活跃订单 (scripts/check-orders.ts) ---
//   bun run scripts/check-orders.ts                    # 查看所有订单
//   bun run scripts/check-orders.ts --market <ID>      # 按市场过滤
//   bun run scripts/check-orders.ts --token <ID>       # 按 token 过滤
//
// --- 9. 取消订单 (scripts/cancel-orders.ts) ---
//   bun run scripts/cancel-orders.ts --order <ORDER_ID>    # 取消单个订单
//   bun run scripts/cancel-orders.ts --market <MARKET_ID>  # 取消某市场全部订单
//
// --- 10. 查看特定 Token 持仓 (scripts/token-balance.ts) ---
//   bun run scripts/token-balance.ts <token_id>


// ============================================================
// negRisk 概念详解
// ============================================================
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
//
// 如何确定市场的 negRisk 值?
//   - 通过 search.ts 或 getTokenId.ts 的输出中获取
//   - 下单时用 --neg-risk 标志指定
//
// ⚠️ 下单时必须正确传入 negRisk，否则订单可能失败!


// ============================================================
// 订单类型参考
// ============================================================
//
// | 类型 | 全称               | 行为                                   |
// |------|--------------------|----------------------------------------|
// | FOK  | Fill or Kill       | 市价单 - 必须全部成交否则取消           |
// | FAK  | Fill and Kill      | 市价单 - 尽可能成交，剩余取消           |
// | GTC  | Good Till Cancelled| 限价单 - 挂单直到成交或手动取消         |
// | GTD  | Good Till Date     | 限价单 - 挂单到指定时间自动过期         |
//
// 价格必须使用 0.001 递增 (如 0.500, 0.501, 不能用 0.5001)


// ============================================================
// 错误码参考
// ============================================================
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


// ============================================================
// SDK 方法速查
// ============================================================
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


// ============================================================
// CLOB API 端点速查
// ============================================================
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
