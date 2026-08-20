该函数涉及云调用，需要在微信开发者工具重新下载和部署。

在小程序端调用此云函数时，需要传入code参数：

```javascript
// 小程序端调用示例
wx.cloud
  .callFunction({
    name: 'get-phoneNumber',
    data: {
      code: event.detail.code, // 从获取手机号按钮事件中获取
    },
  })
  .then((res) => {
    console.log('手机号信息：', res.result);
  })
  .catch((err) => {
    console.error('获取手机号失败：', err);
  });
```

这将会在调试器中输出如下结构的对象：

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "phone_info": {
    "phoneNumber": "xxxxxx",
    "purePhoneNumber": "xxxxxx",
    "countryCode": 86,
    "watermark": {
      "timestamp": 1637744274,
      "appid": "xxxx"
    }
  }
}
```

注意事项：

1. 需要在微信小程序管理后台开启"获取手机号"功能
2. 确保已经安装最新版本的wx-server-sdk
3. code只能使用一次，且有效期为5分钟


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json` 配置文件，安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` so you can deploy with the [CloudBase CLI](https://docs.cloudbase.net/cli/intro) in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 调用测试 / Invoke for testing
tcb fn invoke scf-nodejs-openapi-get-phonenumber --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-openapi-get-phonenumber -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.
