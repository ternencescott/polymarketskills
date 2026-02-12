// 列出事件（支持分类/排序/分页）
// 用法: bun run scripts/list-events.ts [options]
// 示例: bun run scripts/list-events.ts
//        bun run scripts/list-events.ts --tag-slug crypto --limit 5
//        bun run scripts/list-events.ts --order volume --desc --limit 20

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

function printUsage() {
    console.log(`
用法: bun run scripts/list-events.ts [options]

选项:
  --limit <n>           返回数量 (默认 10)
  --offset <n>          跳过前 n 条
  --order <field>       排序字段: volume, liquidity, startDate, endDate, createdAt 等
  --asc                 升序
  --desc                降序 (默认)
  --tag-slug <slug>     按标签 slug 过滤 (如 crypto, politics, sports)
  --tag-id <id>         按标签 ID 过滤
  --active              仅活跃事件 (默认)
  --closed              仅已结束事件
  --all                 所有状态（含已结束）
  --featured            仅精选事件
  --json                输出原始 JSON
  -h, --help            显示帮助
`);
}

async function listEvents(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes("-h") || args.includes("--help")) {
        printUsage();
        process.exit(0);
    }

    let limit = 10;
    let offset: number | undefined;
    let order: string | undefined;
    let ascending: boolean | undefined;
    let tagSlug: string | undefined;
    let tagId: number | undefined;
    let closed: boolean | undefined = false;  // 默认排除已结束事件
    let featured: boolean | undefined;
    let json = false;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--limit":
                limit = parseInt(args[++i]);
                break;
            case "--offset":
                offset = parseInt(args[++i]);
                break;
            case "--order":
                order = args[++i];
                break;
            case "--asc":
                ascending = true;
                break;
            case "--desc":
                ascending = false;
                break;
            case "--tag-slug":
                tagSlug = args[++i];
                break;
            case "--tag-id":
                tagId = parseInt(args[++i]);
                break;
            case "--active":
                closed = false;
                break;
            case "--closed":
                closed = true;
                break;
            case "--all":
                closed = undefined;
                break;
            case "--featured":
                featured = true;
                break;
            case "--json":
                json = true;
                break;
        }
    }

    const params: Record<string, any> = { limit };
    if (offset !== undefined) params.offset = offset;
    if (order) params.order = order;
    if (ascending !== undefined) params.ascending = ascending;
    if (tagSlug) params.tag_slug = tagSlug;
    if (tagId !== undefined) params.tag_id = tagId;
    if (closed !== undefined) params.closed = closed;
    if (featured !== undefined) params.featured = featured;

    const response = await axios.get(`${GAMMA_API_HOST}/events`, { params });
    const events: any[] = response.data;

    if (json) {
        console.log(JSON.stringify(events, null, 2));
        return;
    }

    if (!events || events.length === 0) {
        console.log("未找到事件");
        return;
    }

    console.log(`\nEvents (${events.length}):\n`);
    for (const event of events) {
        const status = event.closed ? "closed" : event.active ? "active" : "inactive";
        const vol = event.volume != null ? `$${Number(event.volume).toLocaleString()}` : "N/A";
        console.log(`  ${event.title}`);
        console.log(`    Slug: ${event.slug}  |  Status: ${status}  |  Volume: ${vol}`);
        console.log(`    Markets: ${event.markets?.length ?? 0}  |  negRisk: ${event.negRisk ?? false}`);
        console.log("");
    }

    if (events.length === limit) {
        console.log(`提示: 已返回 ${limit} 条，使用 --offset ${(offset ?? 0) + limit} 获取更多`);
    }
}

listEvents().catch(console.error);
