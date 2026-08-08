You can use this cloud function to get user's OPENID. This function involves cloud calls and needs to be re-downloaded and deployed in WeChat Developer Tools.

Example code for testing this cloud function in a mini program:

```js
wx.cloud.callFunction({
  name: 'get-openid',
  complete: (res) => {
    console.log('callFunction result: ', res);
  },
});
```

This will output an object with the following structure in the debugger:

```json
{
  "openid": "oxxxxxxxxxxxxxx",
  "appid": "wxxxxxxxxxxx",
  "unionid": "oxxx_xxxxxxxxxxxxx" // Only returned when unionId retrieval conditions are met
}
```


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
tcb fn invoke scf-nodejs-get-openid --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-get-openid -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.
