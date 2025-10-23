const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { code } = event;
  if (!code) {
    throw new Error('Missing parameter code');
  }

  const result = await cloud.openapi.phonenumber.getPhoneNumber({
    code: code,
  });
  return result;
};
