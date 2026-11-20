const { Client } = require('/home/ubuntu/Instatoken/server/node_modules/pg');
const fs = require('fs');

async function main() {
  const env = fs.readFileSync('/home/ubuntu/Instatoken/server/.env', 'utf8');
  const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (!match) throw new Error('No DATABASE_URL found');
  
  const client = new Client({ connectionString: match[1] });
  await client.connect();

  console.log('--- 1. Querying hospitals table ---');
  const res1 = await client.query("SELECT id, name, payment_mode FROM hospitals WHERE id = 'hosp-mu0838sg'");
  console.log('Current in hospitals table:', res1.rows);

  console.log('--- 2. Updating hospitals table to token_only ---');
  await client.query("UPDATE hospitals SET payment_mode = 'token_only' WHERE id = 'hosp-mu0838sg'");

  console.log('--- 3. Updating sync_store global_store ---');
  const syncRes = await client.query("SELECT data FROM sync_store WHERE key = 'global_store'");
  if (syncRes.rows.length > 0 && syncRes.rows[0].data) {
    const store = syncRes.rows[0].data;
    if (store.hospitalProfiles && store.hospitalProfiles['hosp-mu0838sg']) {
      store.hospitalProfiles['hosp-mu0838sg'].payment_mode = 'token_only';
      store.hospitalProfiles['hosp-mu0838sg'].paymentMode = 'token_only';
    }
    if (store.hospitals && Array.isArray(store.hospitals)) {
      const idx = store.hospitals.findIndex(h => h.id === 'hosp-mu0838sg');
      if (idx !== -1) {
        store.hospitals[idx].payment_mode = 'token_only';
        store.hospitals[idx].paymentMode = 'token_only';
      }
    }
    await client.query("UPDATE sync_store SET data = $1 WHERE key = 'global_store'", [JSON.stringify(store)]);
    console.log('Successfully updated sync_store for hosp-mu0838sg to token_only');
  }

  await client.end();
  console.log('Done!');
}

main().catch(console.error);
