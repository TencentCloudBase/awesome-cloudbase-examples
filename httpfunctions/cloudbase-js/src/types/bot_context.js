"use strict";
export class BotContextBase {
  context;
  config;
  info;
  state;
  constructor(context, state) {
    this.context = context;
    if (state !== void 0) {
      this.state = state;
    }
  }
}
export class BotContext extends BotContextBase {
  constructor(context) {
    super(context);
  }
}
