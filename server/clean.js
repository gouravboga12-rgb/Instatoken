const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'data', 'store.json');
if (fs.existsSync(storePath)) {
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  store.tokens = [];
  store.appointments = [];
  store.lastUpdated = Date.now();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log('Successfully cleared dummy tokens and appointments from store.json');
}
