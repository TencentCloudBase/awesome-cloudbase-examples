import { CloudbaseMcpServer } from '@cloudbase/mcp/server';
import { z } from 'zod';
import tcb, { CloudBase } from '@cloudbase/node-sdk';

export function registerExampleTools(server: CloudbaseMcpServer, app?: CloudBase) {
    // 获取最新的用户访问信息
    server
        .tool('getUserVisitInfo')
        .description('获取最新的用户访问信息')
        .inputSchema({
            count: z.number().describe('获取最近 {count} 条用户访问信息'),
        })
        .outputSchema({
            total: z.number().describe('数据模型中总共的用户访问信息数量'),
            records: z
                .array(
                    z.object({
                        device: z.string().describe('用户设备'),
                        visitTime: z.number().describe('用户访问时间'),
                    }),
                )
                .describe('返回的用户访问信息数组'),
        })
        .formatter(({ count }, { records, total }) => {
            return {
                content: [
                    {
                        type: 'text',
                        text: `要求获取 ${count} 条用户访问信息，实际获取到 ${records.length} 条, 数据模型中总共 ${total} 条。\n${records.map((x, index) => `${index + 1}: 来自 ${x.device} 的用户在 ${new Date().toLocaleTimeString()} 访问了。\n`).join('\n')}`,
                    },
                ],
            };
        })
        .create(async ({ count }) => {
            const res = await app.models.sys_user_dau.list({
                pageSize: count,
                getCount: true,
                orderBy: [
                    {
                        visit_time: 'desc',
                    },
                ],
            });

            return {
                total: res.data.total,
                records: res.data.records.map((x) => ({
                    device: x.device,
                    visitTime: x.visit_time,
                })),
            };
        });

    // 获取聊天记录
    server
        .tool('getChatRecords')
        .description('获取聊天记录')
        .inputSchema({
            count: z.number({
                description: '获取的聊天记录数量',
            }),
        })
        .outputSchema({
            total: z.number({
                description: '数据模型中总共的聊天记录数量',
            }),
            records: z.array(
                z.object({
                    content: z.string({
                        description: '聊天记录内容',
                    }),
                    role: z.string({
                        description: '聊天记录角色',
                    }),
                }),
                {
                    description: '聊天记录',
                },
            ),
        })
        .formatter((input, output) => {
            return {
                content: [
                    {
                        type: 'text',
                        text: `要求获取 ${input.count} 条聊天记录，实际获取到 ${output.records.length} 条, 数据模型中总共 ${output.total} 条。\n${output.records.map((x, index) => `${index + 1}: ${x.role}: ${x.content}\n`).join('\n')}`,
                    },
                ],
            };
        })
        .create(async ({ count }) => {
            const res = await app.models.ai_bot_chat_history_5hobd2b.list({
                pageSize: count,
                getCount: true,
            });

            return {
                total: res.data.total,
                records: res.data.records.map((x) => ({
                    content: x.content,
                    role: x.role,
                })),
            };
        });
}
