import { CloudbaseMcpServer } from '@cloudbase/mcp/server';
import { z } from 'zod';
import tcb, { CloudBase } from '@cloudbase/node-sdk';

export function registerHunYuanTools(server: CloudbaseMcpServer, app?: CloudBase) {
    // 提交混元 3D 任务
    server
        .tool('submitHunyuanTo3DJob')
        .description('提交混元生3D任务')
        // Prompt	否	String	3D内容的描述，中文正向提示词。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。
        // 示例值：一只小猫
        // ImageBase64	否	String	输入图 Base64 数据。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。
        // ImageUrl	否	String	输入图Url。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。
        // Num	否	Integer	生成数量。默认1，当前限制只能为1。示例值：1
        .inputSchema({
            Prompt: z.string().describe('3D内容的描述，中文正向提示词。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。').optional(),
            ImageBase64: z.string().describe('输入图 Base64 数据。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。').optional(),
            ImageUrl: z.string().describe('输入图Url。最多支持200个 utf-8 字符，ImageBase64、ImageUrl和 Prompt必填其一，且Prompt和ImageBase64/ImageUrl不能同时存在。').optional(),
        })
        // JobId	String	任务id
        // RequestId	String	唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。
        .outputSchema({
            JobId: z.string().describe('任务id'),
            RequestId: z.string().describe('唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。'),
        })
        .formatter(({ }, { JobId }) => {
            return {
                content: [
                    {
                        type: 'text',
                        text: `生成 3D 任务提交成功，JobId: ${JobId}`,
                    },
                ],
            };
        })
        .create(async (params) => {
            const res = await callHunYuanApi('SubmitHunyuanTo3DJob', params)

            return res
        });

    // 查询混元生3D任务 QueryHunyuanTo3DJob
    server
        .tool('queryHunyuanTo3DJob')
        .description('查询混元生3D任务')
        // JobId    否    String    任务id
        .inputSchema({
            JobId: z.string().describe('任务id'),
        })
        // JobId    String    任务id
        // Status    String    任务状态。WAIT：等待中，RUN：执行中，FAIL：任务失败，DONE：任务成功示例值：RUN
        // ResultFile3Ds Array of File3Ds	生成的3D文件数组
        // ErrorCode	String	错误码 // 示例值：InvalidParameter
        // ErrorMessage	String	错误信息 // 示例值：参数错误
        // RequestId	String	唯一请求 ID，由服务端生成，每次请求都会返回（若请求因其他原因未能抵达服务端，则该次请求不会获得 RequestId）。定位问题时需要提供该次请求的 RequestId。
        .outputSchema({
            JobId: z.string().describe('任务id'),
            Status: z.string().describe('任务状态。WAIT：等待中，RUN：执行中，FAIL：任务失败，DONE：任务成功示例值：RUN'),

            // "File3D": [
            //     {
            //         "Type": "GIF",
            //         "Url": "https://hunyuan-prod-xxx.cos.ap-guangzhou.tencentcos.cn/3d/output/xxx.gif"
            //     },
            //     {
            //         "Type": "OBJ",
            //         "Url": "https://hunyuan-prod-xxx.cos.ap-guangzhou.tencentcos.cn/3d/output/2e56fc_0.zip"
            //     }
            // ]
            ResultFile3Ds: z.array(z.object({
                File3D: z.array(z.object({
                    Type: z.string().describe('文件类型，GIF 或者 OBJ'),
                    Url: z.string().describe('文件地址'),
                })).describe('生成的3D文件数组'),
            })),
            ErrorCode: z.string().describe('错误码 // 示例值：InvalidParameter'),
            ErrorMessage: z.string().describe('错误信息 // 示例值：参数错误'),
        })
        .formatter(({ }, { Status, ResultFile3Ds, ErrorCode, ErrorMessage }) => {
            console.log(ResultFile3Ds)
            const statusMap = {
                WAIT: '等待中',
                RUN: '执行中',
                FAIL: '任务失败',
                DONE: '任务成功',
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `查询 3D 任务成功，任务状态：${statusMap[Status]}
${ResultFile3Ds?.map(item => {
                            return item.File3D?.map(x => {
                                return `${x.Type}: ${x.Url}`
                            }).join('\n')
                        }).join('\n')
                            })
                        `,
                    },
                ],
            }
        })
        .create(async (params) => {
            return await callHunYuanApi('QueryHunyuanTo3DJob', params)
        });
}

// 对接腾讯云接口
async function callHunYuanApi(apiName: string, params: any) {

    const tencentcloud = await import("tencentcloud-sdk-nodejs-hunyuan");

    const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;



    // 实例化一个认证对象，入参需要传入腾讯云账户 SecretId 和 SecretKey，此处还需注意密钥对的保密
    // 代码泄露可能会导致 SecretId 和 SecretKey 泄露，并威胁账号下所有资源的安全性
    // 以下代码示例仅供参考，建议采用更安全的方式来使用密钥
    // 请参见：https://cloud.tencent.com/document/product/1278/85305
    // 密钥可前往官网控制台 https://console.cloud.tencent.com/cam/capi 进行获取
    const clientConfig = {
        credential: {
            secretId: process.env.SECRET_ID,
            secretKey: process.env.SECRET_KEY,
        },
        region: "ap-guangzhou",
        profile: {
            httpProfile: {
                endpoint: "hunyuan.tencentcloudapi.com",
            },
        },
    };

    // 实例化要请求产品的client对象,clientProfile是可选的
    const client = new HunyuanClient(clientConfig);
    return client[apiName](params);
}