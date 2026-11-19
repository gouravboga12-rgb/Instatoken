const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '/home/ubuntu/Instatoken/.env' });

async function renumber() {
  const possiblePaths = [
    '/home/ubuntu/Instatoken/server/data/store.json',
    './server/data/store.json',
    './server/store.json'
  ];

  for (const storePath of possiblePaths) {
    if (fs.existsSync(storePath)) {
      console.log('Found store at:', storePath);
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      store.tokens = (store.tokens || []).map(t => {
        if (t.id === 'tok-8045') {
          console.log('Renumbering token tok-8045 to 2 in store');
          return { ...t, tokenNo: 2, tokenNumber: 2 };
        }
        return t;
      });
      store.appointments = (store.appointments || []).map(a => {
        if (a.id === 'tok-8045' || a.id === 'apt-8045') {
          console.log('Renumbering appointment tok-8045 to 2 in store');
          return { ...a, tokenNumber: 2, tokenNo: 2 };
        }
        return a;
      });
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    }
  }

  if (process.env.DATABASE_URL) {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    console.log('Connected to DB for renumbering...');
    await c.query(`
      UPDATE tokens
      SET token_number = 2,
          data = jsonb_set(jsonb_set(COALESCE(data, '{}'::jsonb), '{tokenNo}', '2'::jsonb), '{tokenNumber}', '2'::jsonb)
      WHERE id = 'tok-8045'
    `);
    await c.query(`
      UPDATE appointments
      SET token_number = 2,
          data = jsonb_set(jsonb_set(COALESCE(data, '{}'::jsonb), '{tokenNo}', '2'::jsonb), '{tokenNumber}', '2'::jsonb)
      WHERE id = 'tok-8045'
    `);
    const check = await c.query(`SELECT id, token_number, data->>'tokenNo' as tok_no FROM tokens WHERE id = 'tok-8045'`);
    console.log('PostgreSQL tok-8045 updated to:', check.rows);
    await c.end();
  }
}

renumber().then(() => {
  console.log('Renumber completed successfully');
  process.exit(0);
}).catch(e => {
  console.error('Renumber error:', e);
  process.exit(1);
});
