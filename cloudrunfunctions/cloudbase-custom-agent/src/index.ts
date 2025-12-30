import { BotRunner } from "@cloudbase/aiagent-framework";
import { TcbEventFunction } from "@cloudbase/functions-typings";
import { MyBot } from "./bot";

export const main: TcbEventFunction<unknown> = function (event, context) {
  return BotRunner.run(
    event,
    context,
    new MyBot(context,)
  );
};
