const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({});

const db = app.database();

module.exports = {
  db,
  _: db.command,
  $: db.command.aggregate,
};
