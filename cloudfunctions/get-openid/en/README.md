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
