// 获取历史价格数据
// 用法: bun run scripts/price-history.ts <token_id> [--interval 1d] [--fidelity 60] [--start <unix_ts>] [--end <unix_ts>]
//
// CLOB API 端点:
//   GET /prices-history?market=<token_id>&interval=1d&fidelity=60
//   GET /prices-history?market=<token_id>&startTs=<ts>&endTs=<ts>&fidelity=60

import { CLOB_HOST } from "./config";

interface PricePoint {
    t: number;
    p: number;
}

export async function getPriceHistory(
    tokenId: string,
    options: {
        interval?: string;
        fidelity?: number;
        startTs?: number;
        endTs?: number;
    } = {}
): Promise<PricePoint[]> {
    const params = new URLSearchParams({ market: tokenId });

    if (options.startTs != null && options.endTs != null) {
        params.set("startTs", String(options.startTs));
        params.set("endTs", String(options.endTs));
    } else {
        params.set("interval", options.interval || "1d");
    }

    if (options.fidelity != null) {
        params.set("fidelity", String(options.fidelity));
    }

    const res = await fetch(`${CLOB_HOST}/prices-history?${params}`);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`API 请求失败 (${res.status}): ${body}`);
    }
    const data = (await res.json()) as { history: PricePoint[] };
    return data.history;
}

function formatTs(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

// CLI entry
if (import.meta.main) {
    const args = process.argv.slice(2);
    const tokenId = args.find((a) => !a.startsWith("--"));
    if (!tokenId) {
        console.error(
            "用法: bun run scripts/price-history.ts <token_id> [--interval 1d|1h|6h|1w|max] [--fidelity <minutes>] [--start <unix_ts>] [--end <unix_ts>]"
        );
        process.exit(1);
    }

    const flagVal = (name: string): string | undefined => {
        const idx = args.indexOf(`--${name}`);
        return idx !== -1 ? args[idx + 1] : undefined;
    };

    const interval = flagVal("interval");
    const fidelity = flagVal("fidelity") ? Number(flagVal("fidelity")) : undefined;
    const startTs = flagVal("start") ? Number(flagVal("start")) : undefined;
    const endTs = flagVal("end") ? Number(flagVal("end")) : undefined;

    console.log("📊 获取历史价格...\n");

    getPriceHistory(tokenId, { interval, fidelity, startTs, endTs })
        .then((history) => {
            if (!history || history.length === 0) {
                console.log("  暂无历史数据");
                return;
            }

            console.log(`  数据点: ${history.length}`);
            console.log(`  时间范围: ${formatTs(history[0].t)} ~ ${formatTs(history[history.length - 1].t)}\n`);

            // 统计摘要
            const prices = history.map((h) => h.p);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const first = prices[0];
            const last = prices[prices.length - 1];
            const change = last - first;
            const changePct = first !== 0 ? (change / first) * 100 : 0;

            console.log("  === 摘要 ===");
            console.log(`  开盘: ${(first * 100).toFixed(1)}¢ ($${first.toFixed(3)})`);
            console.log(`  收盘: ${(last * 100).toFixed(1)}¢ ($${last.toFixed(3)})`);
            console.log(`  最高: ${(max * 100).toFixed(1)}¢ ($${max.toFixed(3)})`);
            console.log(`  最低: ${(min * 100).toFixed(1)}¢ ($${min.toFixed(3)})`);
            console.log(`  变动: ${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}¢ (${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%)\n`);

            // 显示最近数据点（最多 20 条）
            const display = history.length > 20 ? history.slice(-20) : history;
            if (history.length > 20) {
                console.log(`  === 最近 20 条数据 ===`);
            } else {
                console.log(`  === 全部数据 ===`);
            }
            for (const point of display) {
                const bar = "█".repeat(Math.round(point.p * 20));
                console.log(`  ${formatTs(point.t).padEnd(22)} ${(point.p * 100).toFixed(1)}¢  ${bar}`);
            }
        })
        .catch(console.error);
}
