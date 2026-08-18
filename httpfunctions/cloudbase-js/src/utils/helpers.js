"use strict";
import * as crypto from "crypto";
import { customAlphabet } from "nanoid";
export function genRandomStr(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}
export function safeJsonParse(jsonString, defaultValue = {}) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log("safeJsonParse error", error);
    return defaultValue;
  }
}
export function randomId(len = 16) {
  return customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", len)();
}
