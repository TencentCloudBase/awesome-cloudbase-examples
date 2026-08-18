import {
  ContextInjected,
  TcbExtendedContext,
} from "@cloudbase/functions-typings";
import { CloudbaseMcpServer } from "@cloudbase/mcp/server";
import { z } from "zod";
import { DAYS, DEPARTMENTS, DOCTORS } from "./const.js";

export function createServer(context: ContextInjected<TcbExtendedContext>) {
  const server = new CloudbaseMcpServer(
    {
      name: "Mock Hospital MCP Server",
      version: "1.0.0",
    },
    { capabilities: { tools: {} } }
  );

  server
    .tool("makeAppointment")
    .description("预约医生")
    .inputSchema({
      day: z.enum(DAYS).describe("星期几"),
      department: z.enum(DEPARTMENTS).describe("科室名称"),
    })
    .outputSchema({
      success: z.boolean().describe("预约是否成功"),
    })
    .formatter(({ day, department }, { success }) => {
      return {
        content: [
          {
            type: "text",
            text: success
              ? `您已成功预约${department}的${day}门诊，请按时就诊。`
              : `很抱歉，${department}的${day}门诊已约满，请选择其他时间或科室。`,
          },
        ],
      };
    })
    .create(async ({ day, department }) => {
      // 查找指定科室的医生
      const availableDoctors = DOCTORS.filter(
        (doctor) =>
          doctor.department === department || doctor.available.includes(day)
      );

      // 如果有至少一位医生在该科室的指定日期有班，则预约成功
      const success = availableDoctors.length > 0;

      return {
        success,
      };
    });

  server
    .tool("listAppointments")
    .description("列出可预约的医生信息")
    .inputSchema({
      day: z.enum(DAYS).describe("星期几"),
      department: z.enum(DEPARTMENTS).describe("科室名称"),
    })
    .outputSchema({
      doctors: z
        .array(
          z.object({
            name: z.string().describe("医生姓名"),
            title: z.string().describe("医生职称"),
            description: z.string().describe("医生专长"),
          })
        )
        .describe("可预约的医生列表"),
    })
    .formatter(({ day, department }, { doctors }) => {
      return {
        content: [
          {
            type: "text",
            text:
              doctors.length > 0
                ? `${department}科室在${day}有以下医生可预约:\n${doctors.map((d) => `• ${d.title}${d.name}: ${d.description}`).join("\n")}`
                : `${department}科室在${day}没有可预约的医生`,
          },
        ],
      };
    })
    .create(async ({ day, department }) => {
      // 查找指定科室和日期的医生
      const doctors = DOCTORS.filter(
        (doctor) =>
          doctor.department === department && doctor.available.includes(day)
      ).map((doctor) => ({
        name: doctor.name,
        title: doctor.title,
        description: doctor.description,
      }));

      return { doctors };
    });

  return { server };
}
