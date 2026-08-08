const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { code } = event;
  if (!code) {
    // 缺少参数 code / Missing required parameter "code"
    throw new Error('缺少参数code');
  }

  const result = await cloud.openapi.phonenumber.getPhoneNumber({
    code: code,
  });
  return result;
};
