// 列出所有标签/分类
// 用法: bun run scripts/list-tags.ts [options]
// 示例: bun run scripts/list-tags.ts
//        bun run scripts/list-tags.ts --limit 20
//        bun run scripts/list-tags.ts --json

import { GAMMA_API_HOST } from "./config";
import axios from "axios";

async function listTags(): Promise<void> {
    const args = process.argv.slice(2);

    let limit: number | undefined;
    let json = false;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--limit":
                limit = parseInt(args[++i]);
                break;
            case "--json":
                json = true;
                break;
            case "-h":
            case "--help":
                console.log(`
用法: bun run scripts/list-tags.ts [options]

选项:
  --limit <n>   返回数量
  --json        输出原始 JSON
  -h, --help    显示帮助
`);
                process.exit(0);
        }
    }

    const params: Record<string, any> = {};
    if (limit !== undefined) params.limit = limit;

    const response = await axios.get(`${GAMMA_API_HOST}/tags`, { params });
    const tags: any[] = response.data;

    if (json) {
        console.log(JSON.stringify(tags, null, 2));
        return;
    }

    if (!tags || tags.length === 0) {
        console.log("未找到标签");
        return;
    }

    console.log(`\nTags (${tags.length}):\n`);
    for (const tag of tags) {
        console.log(`  ${tag.label ?? tag.slug ?? tag.id}  [slug: ${tag.slug ?? "N/A"}, id: ${tag.id}]`);
    }
}

listTags().catch(console.error);
