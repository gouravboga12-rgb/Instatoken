const fs = require('fs');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, pool } = require('../config/db');

async function restoreGandhi() {
  console.log('🔄 Restoring real-time Gandhi Hospital data from instatoken_dump.sql to new AWS database...');
  console.log('Target DB Host:', process.env.DB_HOST);
  console.log('Target DB Name:', process.env.DB_NAME);

  const dumpPath = path.join(__dirname, '../../instatoken_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error('❌ instatoken_dump.sql not found at', dumpPath);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(dumpPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const statements = [];
  let globalStoreLine = null;

  for await (const line of rl) {
    if (line.includes('hosp-mu0838sg')) {
      if (
        line.startsWith('INSERT INTO "hospitals"') ||
        line.startsWith('INSERT INTO "hospital_profiles"') ||
        line.startsWith('INSERT INTO "hospital_departments"') ||
        line.startsWith('INSERT INTO "hospital_doctors"') ||
        line.startsWith('INSERT INTO "hospital_schedules"') ||
        line.startsWith('INSERT INTO "appointments"') ||
        line.startsWith('INSERT INTO "tokens"')
      ) {
        statements.push(line);
      }
    }
    if (line.startsWith('INSERT INTO "sync_store"') && line.includes('global_store')) {
      globalStoreLine = line;
    }
  }

  console.log(`Found ${statements.length} SQL statements for Gandhi Hospital (hosp-mu0838sg).`);

  let appliedCount = 0;
  for (const rawStmt of statements) {
    try {
      // Convert INSERT INTO "table" ... to execute
      // Handle ON CONFLICT
      let stmt = rawStmt.trim();
      if (!stmt.endsWith(';')) stmt += ';';
      
      // If statement already has ON CONFLICT, execute as is
      // Otherwise add ON CONFLICT DO NOTHING
      if (!stmt.includes('ON CONFLICT')) {
        stmt = stmt.replace(/;$/, ' ON CONFLICT DO NOTHING;');
      }

      await query(stmt);
      appliedCount++;
    } catch (err) {
      console.warn('⚠️ Statement execution warning:', err.message, '\nStmt:', rawStmt.substring(0, 100));
    }
  }

  console.log(`✅ Successfully executed ${appliedCount}/${statements.length} table inserts.`);

  // Now extract from global_store in dump if present
  if (globalStoreLine) {
    try {
      // Find the JSON in VALUES ('global_store', '...')
      const prefix = "VALUES ('global_store', '";
      const startIdx = globalStoreLine.indexOf(prefix);
      if (startIdx !== -1) {
        const jsonStart = startIdx + prefix.length;
        // Last part is ', 'timestamp'); or ', NOW());
        const endIdx = globalStoreLine.lastIndexOf("', '");
        if (endIdx > jsonStart) {
          const escapedJson = globalStoreLine.substring(jsonStart, endIdx);
          const unescaped = escapedJson.replace(/''/g, "'").replace(/\\\\/g, "\\");
          const dumpStore = JSON.parse(unescaped);

          const dumpHosp = (dumpStore.hospitals || []).find(h => h.id === 'hosp-mu0838sg');
          const dumpDocs = dumpStore.hospitalDoctors?.['hosp-mu0838sg'];
          const dumpProfile = dumpStore.hospitalProfiles?.['hosp-mu0838sg'];
          const dumpSched = dumpStore.hospitalSchedules?.['hosp-mu0838sg'];
          const dumpStaff = dumpStore.hospitalStaff?.['hosp-mu0838sg'];
          const dumpDepts = dumpStore.hospitalDepartments?.['hosp-mu0838sg'];

          console.log('\n--- EXTRACTED OBJECTS FROM DUMP GLOBAL_STORE ---');
          console.log('Hospital:', dumpHosp ? dumpHosp.name : 'none');
          console.log('Doctors count:', Array.isArray(dumpDocs) ? dumpDocs.length : 0);
          console.log('Profile present:', Boolean(dumpProfile));
          console.log('Schedules present:', Boolean(dumpSched));
          console.log('Staff count:', Array.isArray(dumpStaff) ? dumpStaff.length : 0);
          console.log('Depts count:', Array.isArray(dumpDepts) ? dumpDepts.length : 0);

          // Now merge into current DB sync_store
          const curStoreRes = await query(`SELECT data FROM sync_store WHERE key = 'global_store'`);
          let currentStore = {};
          if (curStoreRes.rows && curStoreRes.rows.length > 0 && curStoreRes.rows[0].data) {
            currentStore = typeof curStoreRes.rows[0].data === 'string' 
              ? JSON.parse(curStoreRes.rows[0].data) 
              : curStoreRes.rows[0].data;
          }

          currentStore.hospitals = currentStore.hospitals || [];
          if (dumpHosp) {
            const idx = currentStore.hospitals.findIndex(h => h.id === 'hosp-mu0838sg');
            if (idx !== -1) currentStore.hospitals[idx] = dumpHosp;
            else currentStore.hospitals.push(dumpHosp);
          }

          currentStore.hospitalProfiles = currentStore.hospitalProfiles || {};
          if (dumpProfile) currentStore.hospitalProfiles['hosp-mu0838sg'] = dumpProfile;

          currentStore.hospitalDoctors = currentStore.hospitalDoctors || {};
          if (dumpDocs) currentStore.hospitalDoctors['hosp-mu0838sg'] = dumpDocs;

          currentStore.hospitalSchedules = currentStore.hospitalSchedules || {};
          if (dumpSched) currentStore.hospitalSchedules['hosp-mu0838sg'] = dumpSched;

          currentStore.hospitalStaff = currentStore.hospitalStaff || {};
          if (dumpStaff) currentStore.hospitalStaff['hosp-mu0838sg'] = dumpStaff;

          currentStore.hospitalDepartments = currentStore.hospitalDepartments || {};
          if (dumpDepts) currentStore.hospitalDepartments['hosp-mu0838sg'] = dumpDepts;

          await query(
            `INSERT INTO sync_store (key, data, last_updated)
             VALUES ('global_store', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET data = $1, last_updated = NOW()`,
            [JSON.stringify(currentStore)]
          );
          console.log('✅ Updated live sync_store in AWS database with real Gandhi Hospital state!');
        }
      }
    } catch (e) {
      console.warn('⚠️ Error parsing global_store from dump:', e.message);
    }
  }

  // Print summary of restored Gandhi Hospital
  const hospCheck = await query(`SELECT id, name, email, phone, city, state FROM hospitals WHERE id = 'hosp-mu0838sg'`);
  console.log('\n--- RESTORED HOSPITAL IN DATABASE ---');
  console.log(hospCheck.rows[0]);

  const docCheck = await query(`SELECT id, name, specialization, qualification, consultation_fee, active FROM hospital_doctors WHERE hospital_id = 'hosp-mu0838sg'`);
  console.log(`\n--- RESTORED DOCTORS (${docCheck.rows.length}) ---`);
  docCheck.rows.forEach(d => {
    console.log(`  👨‍⚕️ ${d.name} (${d.specialization}) | Fee: ₹${d.consultation_fee} | Active: ${d.active} | ID: ${d.id}`);
  });

  const apptCheck = await query(`SELECT count(*) FROM appointments WHERE hospital_id = 'hosp-mu0838sg'`);
  const tokCheck = await query(`SELECT count(*) FROM tokens WHERE hospital_id = 'hosp-mu0838sg'`);
  console.log(`\n--- TOKENS & APPOINTMENTS ---`);
  console.log(`Appointments restored: ${apptCheck.rows[0].count}`);
  console.log(`Tokens restored: ${tokCheck.rows[0].count}`);

  console.log('\n🎉 ALL REAL-TIME GANDHI HOSPITAL DATA RESTORED TO NEW AWS DATABASE SUCCESSFULLY!');
}

restoreGandhi().catch(err => {
  console.error('Fatal error during restoration:', err);
}).finally(() => pool.end());
