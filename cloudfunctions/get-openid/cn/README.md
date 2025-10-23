你可以使用这个云函数来获取用户的 OPENID。该函数涉及云调用，需要在微信开发者工具重新下载和部署。

在小程序中测试调用这个云函数的示例代码如下：

```js
wx.cloud.callFunction({
  name: 'get-openid',
  complete: (res) => {
    console.log('callFunction result: ', res);
  },
});
```

这将会在调试器中输出如下结构的对象：

```json
{
  "openid": "oxxxxxxxxxxxxxx",
  "appid": "wxxxxxxxxxxx",
  "unionid": "oxxx_xxxxxxxxxxxxx" // 仅在满足 unionId 获取条件时返回
}
```
