/**
 * 统一错误码定义
 * 所有模版共用，确保错误码语义一致
 */

const ErrorCode = {
    // ─── 通用错误 ──────────────────────────────────────
    OK: 0,
    ERROR: -1,

    // ─── 参数校验错误（4xx）─────────────────────────────
    PARAM_MISSING: 1001,      // 必填参数缺失
    PARAM_INVALID: 1002,      // 参数格式非法
    PARAM_OUT_OF_RANGE: 1003, // 参数超出范围

    // ─── 认证授权错误（4xx）─────────────────────────────
    UNAUTHORIZED: 2001,      // 未授权访问
    TOKEN_EXPIRED: 2002,      // Token 已过期
    FORBIDDEN: 2003,          // 无权限操作

    // ─── 外部服务错误（5xx）─────────────────────────────
    SERVICE_UNAVAILABLE: 3001, // 外部服务不可用
    RATE_LIMITED: 3002,        // 触发频率限制
    TIMEOUT: 3003,             // 请求超时

    // ─── 业务逻辑错误 ──────────────────────────────────
    BUSINESS_ERROR: 4001,      // 业务规则校验失败
    STATE_CONFLICT: 4002,      // 状态冲突（如重复下单）
    NOT_FOUND: 4003,           // 资源不存在

    // ─── 微信支付特有 ──────────────────────────────────
    PAY_ORDER_NOT_EXIST: 5001,   // 订单不存在
    PAY_ORDER_CLOSED: 5002,      // 订单已关闭
    PAY_SIGN_ERROR: 5003,        // 签名错误
    PAY_DECRYPT_ERROR: 5004,     // 解密失败
};

/**
 * 创建业务异常（可在 controller catch 中使用）
 */
class AppError extends Error {
    constructor(message, code = ErrorCode.ERROR, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

module.exports = { ErrorCode, AppError };
