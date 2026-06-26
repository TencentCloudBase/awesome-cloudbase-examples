import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-rn';
import {MMKV} from 'react-native-mmkv';

// 持久化存储配置
const storage = new MMKV({id: 'cloudbase-config'});
const CONFIG_KEY = 'cloudbase_config';

// CloudBase 配置接口
export interface CloudbaseConfig {
  env: string;
  accessKey: string;
  region?: string;
}

// 使用 React Native 适配器
cloudbase.useAdapters(adapter);

// 应用实例（延迟初始化）
let app: ReturnType<typeof cloudbase.init> | null = null;

/**
 * 获取保存的配置
 */
export function getSavedConfig(): CloudbaseConfig | null {
  const configStr = storage.getString(CONFIG_KEY);
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 保存配置
 */
export function saveConfig(config: CloudbaseConfig): void {
  storage.set(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 清除配置
 */
export function clearConfig(): void {
  storage.delete(CONFIG_KEY);
  app = null;
}

/**
 * 检查是否已配置
 */
export function isConfigured(): boolean {
  const config = getSavedConfig();
  return !!(config?.env && config?.accessKey);
}

/**
 * 初始化 CloudBase（使用保存的配置或传入新配置）
 */
export function initCloudbase(config?: CloudbaseConfig) {
  const finalConfig = config || getSavedConfig();

  if (!finalConfig?.env) {
    throw new Error('请先配置 env');
  }

  // 保存配置
  if (config) {
    saveConfig(config);
  }

  // 初始化应用
  app = cloudbase.init({
    env: finalConfig.env,
    region: finalConfig.region || 'ap-shanghai',
    accessKey: finalConfig.accessKey,
    endPointMode: 'GATEWAY',
  });

  return app;
}

/**
 * 获取 CloudBase 应用实例
 */
export function getApp() {
  if (!app) {
    // 尝试使用保存的配置初始化
    if (isConfigured()) {
      return initCloudbase();
    }
    throw new Error('CloudBase 未初始化，请先调用 initCloudbase');
  }
  return app;
}

/**
 * 获取 auth 实例
 */
export function getAuth() {
  return getApp().auth;
}

export default {
  getApp,
  getAuth,
  initCloudbase,
  isConfigured,
  getSavedConfig,
  saveConfig,
  clearConfig,
};
