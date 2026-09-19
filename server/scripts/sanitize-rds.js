require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/db');

async function sanitize() {
  console.log('🔄 Starting RDS database sanitization...');

  // 1. Update hospitals table
  console.log('--- Updating hospitals table ---');
  const hRes = await query("SELECT id, name, data FROM hospitals WHERE id = 'hosp-apollo' OR name ILIKE '%apollo%'");
  for (const row of hRes.rows) {
    let dataStr = typeof row.data === 'string' ? row.data : JSON.stringify(row.data);
    dataStr = dataStr
      .replace(/Apollo Spectra Hospital/g, 'City Care Multi-Specialty Hospital')
      .replace(/Apollo Hospitals/g, 'City Care Hospital')
      .replace(/Apollo Spectra/g, 'City Care Hospital')
      .replace(/apollo-hospitals-jubilee-hills-hyderabad\.jpg/g, 'hospital-building.jpg')
      .replace(/info@apollospectra\.com/g, 'info@instatoken.in')
      .replace(/admin@apollospectra\.com/g, 'admin@instatoken.in')
      .replace(/www\.apollospectra\.com/g, 'https://testcodtech.shop');
    
    await query(
      "UPDATE hospitals SET name = $1, data = $2::jsonb, updated_at = NOW() WHERE id = $3",
      ['City Care Multi-Specialty Hospital', dataStr, row.id]
    );
    console.log(`✅ Sanitized hospital: ${row.id}`);
  }

  // 2. Update hospital_profiles table
  console.log('--- Updating hospital_profiles table ---');
  const pRes = await query("SELECT hospital_id, profile_data FROM hospital_profiles WHERE hospital_id = 'hosp-apollo' OR profile_data::text ILIKE '%apollo%'");
  for (const row of pRes.rows) {
    let profStr = typeof row.profile_data === 'string' ? row.profile_data : JSON.stringify(row.profile_data);
    profStr = profStr
      .replace(/Apollo Spectra Hospital/g, 'City Care Multi-Specialty Hospital')
      .replace(/Apollo Hospitals/g, 'City Care Hospital')
      .replace(/Apollo Spectra/g, 'City Care Hospital')
      .replace(/apollo-hospitals-jubilee-hills-hyderabad\.jpg/g, 'hospital-building.jpg')
      .replace(/info@apollospectra\.com/g, 'info@instatoken.in')
      .replace(/admin@apollospectra\.com/g, 'admin@instatoken.in')
      .replace(/www\.apollospectra\.com/g, 'https://testcodtech.shop');

    await query(
      "UPDATE hospital_profiles SET profile_data = $1::jsonb, updated_at = NOW() WHERE hospital_id = $2",
      [profStr, row.hospital_id]
    );
    console.log(`✅ Sanitized hospital_profile: ${row.hospital_id}`);
  }

  // 3. Update hospital_users table if exists
  try {
    const uRes = await query("SELECT * FROM information_schema.tables WHERE table_name = 'hospital_users'");
    if (uRes.rows.length > 0) {
      await query("UPDATE hospital_users SET hospital_name = 'City Care Multi-Specialty Hospital' WHERE hospital_name ILIKE '%apollo%'");
      await query("UPDATE hospital_users SET email = 'admin@instatoken.in' WHERE email ILIKE '%apollo%'");
      console.log('✅ Sanitized hospital_users table');
    }
  } catch (e) {
    console.log('hospital_users table check:', e.message);
  }

  // 4. Update appointments table
  try {
    const aRes = await query("SELECT * FROM information_schema.tables WHERE table_name = 'appointments'");
    if (aRes.rows.length > 0) {
      await query("UPDATE appointments SET hospital_name = 'City Care Multi-Specialty Hospital' WHERE hospital_name ILIKE '%apollo%'");
      console.log('✅ Sanitized appointments table');
    }
  } catch (e) {
    console.log('appointments table check:', e.message);
  }

  // 5. Update tokens table
  try {
    const tRes = await query("SELECT * FROM information_schema.tables WHERE table_name = 'tokens'");
    if (tRes.rows.length > 0) {
      await query("UPDATE tokens SET data = REPLACE(data::text, 'Apollo Spectra Hospital', 'City Care Multi-Specialty Hospital')::jsonb WHERE data::text ILIKE '%apollo%'");
      console.log('✅ Sanitized tokens table');
    }
  } catch (e) {
    console.log('tokens table check:', e.message);
  }

  // 6. Check any remaining Apollo in hospitals and hospital_profiles
  const checkH = await query("SELECT id, name FROM hospitals WHERE name ILIKE '%apollo%'");
  console.log('Remaining Apollo in hospitals name:', checkH.rows.length);

  const checkP = await query("SELECT hospital_id, profile_data FROM hospital_profiles");
  for (const r of checkP.rows) {
    const pStr = JSON.stringify(r.profile_data);
    const matches = pStr.match(/apollo/gi);
    console.log(`Hospital ${r.hospital_id} profile matches for 'apollo':`, matches ? matches.length : 0);
    if (matches) {
      // Find what keys/values match
      const sanitized = pStr
        .replace(/apollo-spectra/gi, 'city-care')
        .replace(/apollospectra/gi, 'citycare')
        .replace(/apollo/gi, (match, offset) => {
          // Check if it's hosp-apollo id
          const surrounding = pStr.substring(Math.max(0, offset - 10), offset + 15);
          console.log('Match context:', surrounding);
          return 'citycare';
        });
    }
  }

  console.log('🎉 RDS database sanitization completed successfully!');
}

sanitize().then(() => process.exit(0)).catch(e => { console.error('Sanitization error:', e); process.exit(1); });
