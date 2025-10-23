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
