import { sys } from 'cc';
import { cloudbaseConfig, STORAGE_KEYS } from '../config/CloudbaseConfig';
import adapter from '@cloudbase/adapter-cocos_native';
import cloudbase from '@cloudbase/js-sdk';

console.log('=====cloudbase adapter:', adapter);
console.log('=====cloudbase sdk:', cloudbase);

/**
 * CloudBase 服务类
 * 封装 CloudBase SDK 的初始化和核心功能
 */
export class CloudbaseService {
  private static instance: CloudbaseService;
  private app: any = null;
  private config: cloudbase.ICloudbaseConfig | null = null;

  private constructor() {}

  static getInstance(): CloudbaseService {
    if (!CloudbaseService.instance) {
      CloudbaseService.instance = new CloudbaseService();
    }
    return CloudbaseService.instance;
  }

  isSDKLoaded(): boolean {
    return typeof cloudbase !== 'undefined';
  }

  getSavedConfig(): cloudbase.ICloudbaseConfig | null {
    const configStr = sys.localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (configStr) {
      try {
        return JSON.parse(configStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  saveConfig(config: cloudbase.ICloudbaseConfig): void {
    sys.localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    this.config = config;
  }

  clearConfig(): void {
    sys.localStorage.removeItem(STORAGE_KEYS.CONFIG);
    this.config = null;
    this.app = null;
  }

  isConfigured(): boolean {
    const config = this.getSavedConfig();
    return !!(config?.env && config?.accessKey);
  }

  init(config?: cloudbase.ICloudbaseConfig): cloudbase.app.App {
    if (!this.isSDKLoaded()) {
      throw new Error('CloudBase SDK 未加载');
    }

    const finalConfig = config || this.getSavedConfig() || cloudbaseConfig;

    if (!finalConfig?.env) {
      throw new Error('请先配置 CloudBase 环境 ID');
    }

    if (config) {
      this.saveConfig(config);
    }

    // 使用适配器
    cloudbase.useAdapters(adapter);

    // 初始化应用
    this.app = cloudbase.init({
      env: finalConfig.env,
      region: finalConfig.region || 'ap-shanghai',
      accessKey: finalConfig.accessKey,
      endPointMode: 'GATEWAY',
    });

    this.config = finalConfig;
    return this.app;
  }

  getApp(): cloudbase.app.App {
    if (!this.app) {
      if (this.isConfigured()) {
        return this.init();
      }
      throw new Error('CloudBase 未初始化');
    }
    return this.app;
  }

  getAuth(): cloudbase.auth.App {
    return this.getApp().auth;
  }

  async callFunction(options: cloudbase.functions.ICallFunctionOptions): Promise<cloudbase.functions.ICallFunctionResponse> {
    return this.getApp().callFunction(options);
  }

  getModels() {
    return this.getApp().models;
  }

  getConfig(): cloudbase.ICloudbaseConfig | null {
    return this.config || this.getSavedConfig();
  }
}

export const cloudbaseService = CloudbaseService.getInstance();
