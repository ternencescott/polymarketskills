# Polymarket CLOB Skills

基于 bun 运行时的 Polymarket CLOB 交易工具集。

## 前置条件

1. 安装 bun（如已安装则跳过）：
   ```bash
   command -v bun >/dev/null 2>&1 && echo "bun 已安装: $(bun --version)" || { curl -fsSL https://bun.sh/install | bash && source ~/.bashrc; }
   ```
2. 创建 `.env` 文件：
   ```
   PRIVATE_KEY=<你的钱包私钥>
   FUNDER_ADDRESS=<你的 Polymarket proxy wallet 地址>
   ```

> bun 具备 auto-install 能力，无需手动 `bun add / bun install`，依赖版本由 `package.json` 和 `bun.lock` 锁定。

> **安全提醒**：PRIVATE_KEY 拥有钱包完全控制权，切勿泄露。确保 `.env` 已加入 `.gitignore`。

## 网站前置步骤

使用前必须在 Polymarket 网站上完成：

1. **注册账户** — 前往 https://polymarket.com 注册登录（支持钱包或邮箱）
2. **Enable Trading** — 点击 "Enable Trading"，链上创建 proxy wallet (Gnosis Safe)，完成 USDC 授权
3. **充值 USDC** — 向 proxy wallet 充值（建议 >= $5，支持 Polygon 直充或跨链桥）

完成后获得 `PRIVATE_KEY` 和 `FUNDER_ADDRESS`，填入 `.env` 即可。

## 入门流程

1. 填写 `.env`（PRIVATE_KEY + FUNDER_ADDRESS）
2. `bun run scripts/check-balance.ts` — 确认 USDC.e >= $5
3. 开始交易

## 命令速查

```bash
bun run scripts/check-balance.ts                        # 检查余额
bun run scripts/search.ts <keyword> [limit]             # 搜索市场
bun run scripts/getTokenId.ts <event_url>               # 获取 tokenId
bun run scripts/price-info.ts <token_id>                # 获取价格
bun run scripts/orderbook.ts <token_id>                 # 查看订单簿
bun run scripts/buy.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
bun run scripts/sell.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
bun run scripts/check-orders.ts [--market <ID>] [--token <ID>]
bun run scripts/token-balance.ts <token_id>             # 查看持仓
bun run scripts/cancel-orders.ts --order <ID> | --market <ID>
```

## 配置说明 (`scripts/config.ts`)

- 鉴权：`createOrDeriveApiKey()` 自动派生 API 凭证，无需手动管理
- ethers v6 用于链上交互；`@ethersproject/wallet` v5 用于 ClobClient 签名（SDK 硬依赖），两者共存无冲突

## 脚本用法详解

### 1. 检查余额 — `check-balance.ts`

查询 FUNDER_ADDRESS 的 USDC.e 链上余额（合约 `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`）和 CLOB 内部余额。

### 2. 搜索市场 — `search.ts <keyword> [limit]`

调用 `GET https://gamma-api.polymarket.com/public-search`，参数：`q`(必填)、`limit_per_type`、`events_status`、`events_tag`、`sort`、`ascending`。

返回：`{ events, tags, profiles, pagination }`

### 3. 获取 tokenId — `getTokenId.ts <event_url>`

从 Event URL 解析出 tokenId。示例：`bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down`

### 4. 获取价格 — `price-info.ts <token_id>`

| 端点 | 含义 |
|------|------|
| `GET /price?side=SELL&token_id=<ID>` | ASK（你的买入价） |
| `GET /price?side=BUY&token_id=<ID>` | BID（你的卖出价） |
| `GET /midpoint?token_id=<ID>` | 中间价（参考） |

> `side` 指做市商方向：SELL = 你买入，BUY = 你卖出。

### 5. 订单簿 — `orderbook.ts <token_id>`

获取完整 bids + asks，计算 spread 和中间价。

### 6. 买入 — `buy.ts`

| 订单类型 | `--size` 含义 |
|----------|---------------|
| `--type market` | 花费的美元金额 |
| `--type limit` | 购买的 share 数量 |

最小订单：Market > $1.00，Limit >= 5 shares 且总价值 > $1.00

### 7. 卖出 — `sell.ts`

| 订单类型 | `--size` 含义 |
|----------|---------------|
| `--type market` | 收到的美元金额 |
| `--type limit` | 卖出的 share 数量 |

### 8. 查看订单 — `check-orders.ts`

`--market <ID>` 按市场过滤，`--token <ID>` 按 token 过滤，无参数查看全部。

### 9. 取消订单 — `cancel-orders.ts`

`--order <ID>` 取消单个，`--market <ID>` 取消某市场全部。

### 10. 查看持仓 — `token-balance.ts <token_id>`

## negRisk 说明

| 类型 | 说明 | 示例 |
|------|------|------|
| `negRisk: false` | 标准二元市场，YES + NO = 100% | "BTC 今天会涨吗？" |
| `negRisk: true` | 多选市场，各选项独立定价 | "谁会赢得大选？" |

通过 `search.ts` 或 `getTokenId.ts` 输出获取，下单时用 `--neg-risk` 指定。**必须正确传入，否则订单失败。**

## 订单类型

| 类型 | 全称 | 行为 |
|------|------|------|
| FOK | Fill or Kill | 市价单，必须全部成交否则取消 |
| FAK | Fill and Kill | 市价单，尽可能成交，剩余取消 |
| GTC | Good Till Cancelled | 限价单，挂单直到成交或手动取消 |
| GTD | Good Till Date | 限价单，到期自动过期 |

价格精度：0.001 递增（如 0.500, 0.501）

## 错误码

| 错误码 | 说明 | 解决 |
|--------|------|------|
| `INVALID_ORDER_MIN_TICK_SIZE` | 价格精度不符 | 使用 0.001 递增 |
| `INVALID_ORDER_MIN_SIZE` | size 太小 | 增加 size |
| `INVALID_ORDER_NOT_ENOUGH_BALANCE` | 余额不足 | 充值 USDC |
| `INVALID_ORDER_DUPLICATED` | 重复订单 | 先取消已有订单 |
| `FOK_ORDER_NOT_FILLED_ERROR` | FOK 无法全部成交 | 改用 FAK 或减小 size |
| `INVALID_POST_ONLY_ORDER` | Post-only 会立即成交 | 调整价格 |
| `MARKET_NOT_READY` | 市场暂不接受订单 | 等待或换市场 |

## SDK 方法速查

**订单操作**
- `client.createAndPostOrder(params, options, orderType)` — params: `{ tokenID, price, size, side }`, options: `{ tickSize, negRisk }`
- `client.createMarketOrder(params)` / `client.postOrder(order, orderType)`

**订单查询**
- `client.getOpenOrders(params?)` — 可传 `{ asset_id }` 过滤
- `client.getOrder(orderID)` / `client.getOrderBook(tokenID)`

**取消订单**
- `client.cancelOrder({ orderID })` / `client.cancelMarketOrders({ market })`

**账户信息**
- `client.getBalanceAllowance({ asset_type })` — `COLLATERAL`(USDC) 或 `CONDITIONAL`(需传 token_id)
- `client.getPositions()` / `client.getApiKeys()` / `client.createOrDeriveApiKey()`

## CLOB API 端点

Base URL: `https://clob.polymarket.com`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/order` | 提交订单 |
| DELETE | `/order` | 取消订单 |
| DELETE | `/cancel-market-orders` | 取消某市场订单 |
| GET | `/midpoint?token_id=<ID>` | 中间价 |
| GET | `/price?side=BUY\|SELL&token_id=<ID>` | 市场价格 |
| GET | `/book?token_id=<ID>` | 订单簿 |
| GET | `/data/orders?market=<ID>` | 按市场查询订单 |
| GET | `/data/order/<order_id>` | 查询单个订单 |
| GET | `/balance?asset_type=COLLATERAL` | 余额和授权 |
| GET | `/positions` | 持仓 |
