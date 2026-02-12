# Polymarket CLOB Skills

基于 bun 运行时的 Polymarket CLOB 交易工具集。

## 环境检查（首次使用必读）

在执行任何脚本之前，请先检查 `scripts/` 目录是否存在：

```bash
ls scripts/config.ts 2>/dev/null && echo "✅ scripts 目录已就绪" || echo "❌ scripts 目录缺失，请执行下方 clone 命令"
```

如果 `scripts/` 目录不存在或缺失关键文件，请克隆仓库：

```bash
git clone git@github.com:ternencescott/polymarketskills.git && cd polymarketskills
```

> **注意**：所有命令均需在仓库根目录（包含 `scripts/` 和 `package.json` 的目录）下执行。

## Documentation Index

Fetch the complete documentation index at: https://docs.polymarket.com/llms.txt

Use this file to discover all available pages before exploring further.

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
bun run scripts/list-tags.ts [--limit <n>] [--json]     # 列出标签/分类
bun run scripts/list-events.ts [options]                # 浏览事件列表（见下方详解）
bun run scripts/search.ts <keyword> [options]               # 搜索市场（见下方详解）
bun run scripts/getTokenId.ts <event_url|slug>               # 获取 tokenId
bun run scripts/getMarketDetail.ts <market_id>               # 获取 Market 详情
bun run scripts/price-info.ts <token_id>                # 获取价格
bun run scripts/price-history.ts <token_id> [--interval 1d|1h|6h|1w|max] [--fidelity <min>]  # 历史价格
bun run scripts/orderbook.ts <token_id>                 # 查看订单簿
bun run scripts/buy.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
bun run scripts/sell.ts --token <ID> --price <P> --size <S> [--type market|limit] [--tick 0.01] [--neg-risk]
bun run scripts/check-orders.ts [--market <ID|slug|URL>] [--token <ID>]
bun run scripts/token-balance.ts <token_id>             # 查看持仓
bun run scripts/cancel-orders.ts --order <ID> | --market <ID>
```


## 脚本用法详解

### 1. 检查余额 — `check-balance.ts`

查询 FUNDER_ADDRESS 的 USDC.e 链上余额（合约 `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`）和 CLOB 内部余额。

### 2. 列出标签 — `list-tags.ts [options]`

| 参数 | 说明 |
|------|------|
| `--limit <n>` | 返回数量 |
| `--json` | 输出原始 JSON |

**示例：**
- `bun run scripts/list-tags.ts` — 列出所有标签
- `bun run scripts/list-tags.ts --limit 20` — 返回 20 个标签

输出每个标签的 label、slug、id。可将 slug 传给 `list-events.ts --tag-slug <slug>` 按分类浏览事件。

### 3. 浏览事件 — `list-events.ts [options]`

默认返回 10 条活跃事件，输出精简信息（title、slug、status、volume、markets 数量、negRisk）。

**命令行参数：**

| 参数 | 说明 |
|------|------|
| `--limit <n>` | 返回数量（默认 10） |
| `--offset <n>` | 跳过前 n 条（分页用） |
| `--order <field>` | 排序字段：`volume`、`liquidity`、`startDate`、`endDate`、`createdAt` 等 |
| `--asc` / `--desc` | 升序/降序（默认降序） |
| `--tag-slug <slug>` | 按标签 slug 过滤（如 `crypto`、`politics`、`sports`） |
| `--tag-id <id>` | 按标签 ID 过滤 |
| `--active` | 仅活跃事件（默认） |
| `--closed` | 仅已结束事件 |
| `--all` | 所有状态（含已结束） |
| `--featured` | 仅精选事件 |
| `--json` | 输出原始 JSON |

**示例：**
- `bun run scripts/list-events.ts` — 默认列出 10 条活跃事件
- `bun run scripts/list-events.ts --order volume --desc` — 按成交量排序
- `bun run scripts/list-events.ts --tag-slug crypto --limit 5` — 加密货币分类下前 5 条
- `bun run scripts/list-events.ts --offset 10 --limit 10` — 第二页

输出的 slug 可用于 `getTokenId.ts <slug>` 下钻获取 tokenId 和市场详情。

### 4. 搜索市场 — `search.ts <keyword> [options]`

**命令行参数：**

| 参数 | 说明 |
|------|------|
| `--limit <n>` | 每类结果数量（默认 5） |
| `--status <s>` | 事件状态：`active`(默认)、`closed`、`all` |
| `--sort <field>` | 排序字段：`volume`、`liquidity`、`startDate`、`endDate`、`createdAt` 等 |
| `--asc` / `--desc` | 升序/降序 |
| `--tag <tag>` | 按标签过滤（可多次指定） |
| `--exclude-tag <id>` | 排除标签 ID（可多次指定） |
| `--page <n>` | 分页页码 |
| `--closed` | 展开时保留已结算的子市场（默认隐藏已关闭的子 market，仅显示可交易的） |
| `--no-tags` | 不搜索标签 |
| `--no-profiles` | 不搜索用户 |
| `--recurrence <r>` | Recurrence 过滤 |
| `--cache` / `--no-cache` | 启用/禁用缓存 |
| `--optimized` | 启用优化搜索 |
| `--expand` | 展开子 market 详情（含价格/tokenId/spread） |
| `--json` | 输出原始 JSON |

**示例：**
- `bun run scripts/search.ts bitcoin --limit 10 --expand`
- `bun run scripts/search.ts election --status all --sort volume --desc`
- `bun run scripts/search.ts crypto --tag Sports --closed --json`
- `bun run scripts/search.ts trump --page 2 --no-profiles`

返回：`{ events, tags, profiles, pagination }`

### 5. 获取 tokenId — `getTokenId.ts <event_url|slug>`

从 Event URL 或 slug 解析出 tokenId。示例：
- `bun run scripts/getTokenId.ts https://polymarket.com/event/bitcoin-up-or-down`
- `bun run scripts/getTokenId.ts bitcoin-up-or-down`

### 6. 获取 Market 详情 — `getMarketDetail.ts <market_id>`

通过 Market ID 获取精简详情：question、状态、endDate、description（截断200字）、outcomes/价格、成交量、流动性、bid/ask/spread、tick size、CLOB token IDs、所属 Event 信息。

### 7. 获取价格 — `price-info.ts <token_id>`


### 8. 历史价格 — `price-history.ts <token_id>`

获取指定 token 的历史价格数据。

| 参数 | 说明 |
|------|------|
| `--interval 1d` | 时间窗口：`1m`(1分钟), `1h`, `6h`, `1d`(默认), `1w`, `max` |
| `--fidelity 60` | 数据精度（分钟），如 60 = 每小时一个数据点 |
| `--start <ts>` | 起始 Unix 时间戳（与 `--end` 配合使用，替代 `--interval`） |
| `--end <ts>` | 结束 Unix 时间戳 |

示例：
- `bun run scripts/price-history.ts <token_id>` — 最近 1 天
- `bun run scripts/price-history.ts <token_id> --interval 1w --fidelity 360` — 最近 1 周，每 6 小时
- `bun run scripts/price-history.ts <token_id> --start 1697875200 --end 1697961600 --fidelity 60`

输出包含：数据点数量、时间范围、开盘/收盘/最高/最低/变动摘要、价格走势图。

### 9. 订单簿 — `orderbook.ts <token_id>`

获取完整 bids + asks，计算 spread 和中间价。

### 10. 买入 — `buy.ts`

| 订单类型 | `--size` 含义 |
|----------|---------------|
| `--type market` | 花费的美元金额 |
| `--type limit` | 购买的 share 数量 |

最小订单：Market > $1.00，Limit >= 5 shares 且总价值 > $1.00

### 11. 卖出 — `sell.ts`

| 订单类型 | `--size` 含义 |
|----------|---------------|
| `--type market` | 收到的美元金额 |
| `--type limit` | 卖出的 share 数量 |

### 12. 查看订单 — `check-orders.ts`

`--token <ID>` 按 token 过滤，`--market <ID|slug|URL>` 按市场过滤（支持 condition ID、event slug、完整 URL，自动解析），无参数查看全部。

### 13. 取消订单 — `cancel-orders.ts`

`--order <ID>` 取消单个，`--market <ID>` 取消某市场全部。

### 14. 查看持仓 — `token-balance.ts <token_id>`

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
