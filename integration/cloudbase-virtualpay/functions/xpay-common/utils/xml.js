/**
 * 极简 XML 工具
 *
 * 虚拟支付回调走「小程序消息推送」通道，数据格式可能是 XML 或 JSON（取决于集成登记）。
 * 网关解密后按原样转发，所以这里可能收到 XML 字符串。
 * 只做一层标签提取，够解析 Event / OutTradeNo / OpenId 等平铺字段即可。
 *
 * 说明：本模块只负责「解析」。
 * 应答体不做动态生成 —— 官方要求的应答格式是固定字符串，
 * 且格式错误会导致微信重推 15 次，因此由 controller 直接使用字面量，避免任何加工环节引入偏差。
 */

/** 回调报文长度上限：正常推送 < 8KB，留足冗余；超限说明不是正常推送 */
const MAX_XML_LENGTH = 64 * 1024;

/**
 * XML 字符串 → 对象（仅一层）
 * @param {string} xml
 * @returns {Object}
 */
function xmlToObject(xml) {
    const obj = {};
    if (typeof xml !== 'string') return obj;

    // 回调报文由外部控制（默认信任模型下 /callback 不挂鉴权），
    // 超长输入交给带回溯的正则会拖死实例 —— 先做长度上限，超限直接当空对象
    if (xml.length > MAX_XML_LENGTH) {
        console.warn('[Xml] 报文超过长度上限，拒绝解析:', xml.length);
        return obj;
    }

    // ⚠️ 内容部分用 [^<]* 而非 [\s\S]*?：
    // 若允许内容含 <，外层 <xml> 会被优先匹配并把所有内层字段整个吞掉，
    // 导致解析结果只剩 { xml: '...' }。限制不含 < 后，外层自然跳过，只取叶子节点。
    //
    // ⚠️ CDATA 分支的两条边界：
    //   ① 上限必须覆盖整个报文（MAX_XML_LENGTH），写成 {1,8192} 时长度 8193 的
    //      CDATA 两条分支都匹配不上 → **整个字段消失**（不是截断），下游取不到 Event；
    //   ② 下限必须是 0，否则空 CDATA（<a><![CDATA[]]></a>）同样丢字段。
    //   仍保留有界量词（而非 [\s\S]*?），避免无配对 ]]> 时在长输入上反复回溯。
    const re = /<([A-Za-z_][\w.-]*)\s*>(?:<!\[CDATA\[([\s\S]{0,65536}?)\]\]>|([^<]*))<\/\1>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        obj[m[1]] = m[2] !== undefined ? m[2] : (m[3] || '').trim();
    }

    // 静默丢字段是排查噩梦：报文里有标签却一个字段都没解析出来，必须留痕
    if (Object.keys(obj).length === 0 && xml.indexOf('<') >= 0) {
        console.warn('[Xml] 报文含标签但未解析出任何字段，检查格式/转义是否异常');
    }
    return obj;
}

/**
 * 推送明文 → 对象（按形态自动选择解析方式）
 *
 * ⚠️ 这里踩过一个真实故障：
 *    后台「数据格式」选 JSON 时，安全模式解密出来的明文是 **JSON 字符串**，
 *    如果一律用 xmlToObject 解析 → 得到空对象 → 取不到 Event
 *    → 云 API 适配层无法反查路由 → 推送打到根路径时直接 404。
 *    日志上表现为「密文已解密」紧接着 404，极具迷惑性。
 *
 * @param {string|Object} payload
 * @returns {Object}
 */
function parsePayload(payload) {
    if (payload && typeof payload === 'object') return payload;
    if (typeof payload !== 'string') return {};

    const trimmed = payload.trim();
    if (!trimmed) return {};

    // JSON 明文（后台数据格式 = JSON）
    if (trimmed.startsWith('{')) {
        try {
            const obj = JSON.parse(trimmed);
            return obj && typeof obj === 'object' ? obj : {};
        } catch (_) {
            // 形似 JSON 但解析失败，继续按 XML 尝试
        }
    }

    // XML 明文（后台数据格式 = XML）
    if (trimmed.startsWith('<')) return xmlToObject(trimmed);

    return {};
}

module.exports = { xmlToObject, parsePayload };
