This function involves openapi and needs to be re-downloaded and deployed in WeChat Developer Tools.

When calling this Cloudbase function in the mini program, you need to pass the code parameter:

```javascript
// Mini program call example
wx.cloud
  .callFunction({
    name: 'get-phoneNumber',
    data: {
      code: event.detail.code, // Get from phone number button event
    },
  })
  .then((res) => {
    console.log('Phone number information:', res.result);
  })
  .catch((err) => {
    console.error('Failed to get phone number:', err);
  });
```

This will output an object with the following structure in the debugger:

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

Notes:

1. Need to enable "Get Phone Number" function in WeChat Mini Program management backend
2. Ensure the latest version of wx-server-sdk is installed
3. Code can only be used once and is valid for 5 minutes


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
