const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.json({ message: 'Hello World from Express on CloudBase Run!', timestamp: new Date().toISOString() });
});
app.listen(8080, '0.0.0.0', () => console.log('Express on 8080'));
