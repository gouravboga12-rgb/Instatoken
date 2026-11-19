const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function renumber() {
  const storePath = './server/store.json';
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    store.tokens = (store.tokens || []).map(t => {
      if (t.id === 'tok-8045') {
        return { ...t, tokenNo: 2, tokenNumber: 2 };
      }
      return t;
    });
    store.appointments = (store.appointments || []).map(a => {
      if (a.id === 'tok-8045' || a.id === 'apt-8045') {
        return { ...a, tokenNumber: 2, tokenNo: 2 };
      }
      return a;
    });
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    console.log('Updated store.json successfully');
  }

  if (process.env.DATABASE_URL) {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    await c.query(`UPDATE tokens SET token_number = 2, data = jsonb_set(COALESCE(data, '{}'::jsonb), '{tokenNo}', '2'::jsonb) WHERE id = 'tok-8045'`);
    await c.query(`UPDATE appointments SET token_number = 2, data = jsonb_set(COALESCE(data, '{}'::jsonb), '{tokenNumber}', '2'::jsonb) WHERE id = 'tok-8045'`);
    await c.end();
    console.log('Updated RDS tokens and appointments successfully');
  }
}

renumber().then(() => {
  console.log('Done renumbering');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
