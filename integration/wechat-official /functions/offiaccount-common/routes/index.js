/**
 * 路由汇总
 * 所有公众号接口路由统一在此注册
 */

const express = require('express');
const router = express.Router();

// 控制器
const oauthController      = require('../controllers/oauthController');
const tokenController      = require('../controllers/tokenController');
const jssdkController      = require('../controllers/jssdkController');
const openApiController    = require('../controllers/openApiController');
const subscribeController  = require('../controllers/subscribeController');
const kefuController       = require('../controllers/kefuController');
const menuController       = require('../controllers/menuController');
const messageController    = require('../controllers/messageController');
const userController       = require('../controllers/userController');
const mediaController      = require('../controllers/mediaController');
const qrcodeController     = require('../controllers/qrcodeController');
const accountController    = require('../controllers/accountController');

// ─── 网页授权 ────────────────────────────────────────────────
router.post('/oauth/config',       oauthController.getConfig);
router.post('/oauth/token',        oauthController.exchangeCode);
router.post('/oauth/refresh',      oauthController.refreshToken);
router.post('/oauth/userinfo',     oauthController.getUserinfo);
router.post('/oauth/verify',       oauthController.verifyToken);

// ─── AccessToken ─────────────────────────────────────────────
router.post('/token/get',          tokenController.getToken);
router.post('/token/stable',       tokenController.getStableToken);

// ─── JS-SDK ──────────────────────────────────────────────────
router.post('/jssdk/config',       jssdkController.getConfig);

// ─── 开放接口管理 ─────────────────────────────────────────────
router.post('/openapi/clear_quota',     openApiController.clearQuota);
router.post('/openapi/get_quota',       openApiController.getQuota);
router.post('/openapi/get_rid',         openApiController.getRid);
router.post('/openapi/reset_appsecret', openApiController.resetAppsecret);

// ─── 订阅通知 ─────────────────────────────────────────────────
router.post('/subscribe/bizsend',                subscribeController.bizsend);
router.post('/subscribe/addtemplate',            subscribeController.addTemplate);
router.post('/subscribe/deltemplate',            subscribeController.delTemplate);
router.post('/subscribe/getcategory',            subscribeController.getCategory);
router.post('/subscribe/getpubtemplatetitles',   subscribeController.getPubTemplateTitles);
router.post('/subscribe/getpubtemplatekeywords', subscribeController.getPubTemplateKeywords);
router.post('/subscribe/list',                   subscribeController.listTemplates);

// ─── 客服消息 ─────────────────────────────────────────────────
router.post('/kefu/send',    kefuController.send);
router.post('/kefu/typing',  kefuController.typing);
router.post('/kefu/add',     kefuController.addAccount);
router.post('/kefu/update',  kefuController.updateAccount);
router.post('/kefu/del',     kefuController.delAccount);
router.post('/kefu/list',    kefuController.listAccounts);

// ─── 自定义菜单 ───────────────────────────────────────────────
router.post('/menu/create',  menuController.create);
router.post('/menu/get',     menuController.get);
router.post('/menu/delete',  menuController.del);

// ─── 消息管理 ─────────────────────────────────────────────────
router.post('/message/template_send', messageController.templateSend);
router.post('/message/mass_send',     messageController.massSend);

// ─── 用户管理 ─────────────────────────────────────────────────
router.post('/user/info',  userController.getUserInfo);
router.post('/user/list',  userController.getUserList);
router.post('/user/tags',  userController.tags);

// ─── 素材管理 ─────────────────────────────────────────────────
router.post('/media/upload_temp',       mediaController.uploadTemp);
router.post('/media/add_news',          mediaController.addNews);
router.post('/media/batchget_material', mediaController.batchGetMaterial);

// ─── 带参数二维码 ─────────────────────────────────────────────
router.post('/qrcode/create', qrcodeController.create);
router.post('/qrcode/show',   qrcodeController.show);

// ─── 账号管理 ─────────────────────────────────────────────────
router.post('/account/shorturl', accountController.shortUrl);

module.exports = router;
