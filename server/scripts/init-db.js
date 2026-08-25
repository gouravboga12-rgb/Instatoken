require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, testConnection, pool } = require('../config/db');

async function initDb() {
  console.log('🔄 Initializing AWS RDS PostgreSQL Database...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Could not establish database connection. Aborting.');
    process.exit(1);
  }

  try {
    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await query(schemaSql);
    console.log('✅ Schema tables and indexes applied successfully.');

    // 2. Migrate existing store.json if available
    const storePath = path.join(__dirname, '../data/store.json');
    if (fs.existsSync(storePath)) {
      const storeData = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      
      // Save global sync snapshot
      await query(
        `INSERT INTO sync_store (key, data, last_updated) 
         VALUES ('global_store', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET data = $1, last_updated = NOW()`,
        [JSON.stringify(storeData)]
      );
      console.log('✅ Global store snapshot migrated to sync_store table.');

      // Migrate Hospitals
      if (storeData.hospitals && Array.isArray(storeData.hospitals)) {
        for (const hosp of storeData.hospitals) {
          await query(
            `INSERT INTO hospitals (id, name, logo_url, cover_image_url, email, phone, city, state, data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET name = $2, logo_url = $3, cover_image_url = $4, data = $9, updated_at = NOW()`,
            [hosp.id, hosp.name, hosp.logo || '', hosp.coverImage || '', hosp.email || '', hosp.phone || '', hosp.city || '', hosp.state || '', JSON.stringify(hosp)]
          );
        }
        console.log(`✅ Migrated ${storeData.hospitals.length} hospitals.`);
      }

      // Migrate Hospital Profiles
      if (storeData.hospitalProfiles) {
        for (const [hospId, profile] of Object.entries(storeData.hospitalProfiles)) {
          // Ensure hospital exists
          await query(
            `INSERT INTO hospitals (id, name, logo_url, cover_image_url, email, phone, city, state, data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET name = $2, data = $9, updated_at = NOW()`,
            [hospId, profile.name || 'Hospital', profile.logo || '', profile.coverImage || '', profile.email || '', profile.phone || '', profile.city || '', profile.state || '', JSON.stringify(profile)]
          );

          await query(
            `INSERT INTO hospital_profiles (hospital_id, profile_data, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (hospital_id) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
            [hospId, JSON.stringify(profile)]
          );
        }
        console.log('✅ Migrated hospital profiles.');
      }

      // Migrate Doctors
      if (storeData.hospitalDoctors) {
        for (const [hospId, doctors] of Object.entries(storeData.hospitalDoctors)) {
          if (Array.isArray(doctors)) {
            for (const doc of doctors) {
              await query(
                `INSERT INTO hospital_doctors (id, hospital_id, name, specialization, department_id, department_name, photo_url, qualification, experience, consultation_fee, rating, total_patients, active, data, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                 ON CONFLICT (id) DO UPDATE SET name = $3, specialization = $4, photo_url = $7, consultation_fee = $10, active = $13, data = $14, updated_at = NOW()`,
                [doc.id, hospId, doc.name, doc.specialization || '', doc.departmentId || '', doc.departmentName || '', doc.photo || '', doc.qualification || '', doc.experience || 0, doc.consultationFee || 0, doc.rating || 5.0, doc.totalPatients || 0, doc.active !== false, JSON.stringify(doc)]
              );
            }
          }
        }
        console.log('✅ Migrated hospital doctors.');
      }
    }

    console.log('🎉 Database initialization and migration completed successfully!');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDb();
