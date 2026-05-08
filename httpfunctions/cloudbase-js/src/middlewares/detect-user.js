"use strict";
import {
  Middleware
} from "@ag-ui/client";
import { jwtDecode } from "jwt-decode";
export class DetectCloudbaseUserMiddleware extends Middleware {
  _req;
  constructor(req) {
    super();
    this._req = req;
  }
  run(input, next) {
    let jwtToken = {};
    try {
      const authHeader = this._req.headers?.Authorization || this._req.headers?.authorization || this._req.headers?.get?.("Authorization") || this._req.headers?.get?.("authorization");
      if (authHeader) {
        const jwt = authHeader.split(" ")[1];
        if (!jwt) {
          throw new Error("invalid jwt");
        }
        const decoded = jwtDecode(jwt);
        if (!decoded || !decoded.sub) {
          throw new Error("invalid jwt");
        }
        jwtToken = decoded;
      }
    } catch (e) {
      console.log("JWT decode error:", e);
    }
    if (jwtToken?.sub) {
      return next.run({
        ...input,
        state: {
          ...input.state,
          __request_context__: {
            user: {
              id: jwtToken.sub,
              jwt: jwtToken
            },
            request: this._req
          }
        }
      });
    } else {
      return next.run(input);
    }
  }
}
