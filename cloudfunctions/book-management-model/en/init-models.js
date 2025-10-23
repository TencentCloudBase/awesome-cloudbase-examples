const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({});

exports.models = app.models;
