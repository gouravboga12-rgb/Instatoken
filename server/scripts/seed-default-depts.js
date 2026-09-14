const { query, pool } = require('../config/db.js');

const DEFAULT_DEPARTMENTS = [
  { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-neuro', name: 'Neurology', icon: '🧠', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-gynaec', name: 'Gynecology', icon: '🌸', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-general', name: 'General Medicine', icon: '🩺', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-eye', name: 'Ophthalmology', icon: '👁️', headDoctor: '', totalDoctors: 0, active: true },
  { id: 'dept-dental', name: 'Dental', icon: '🦷', headDoctor: '', totalDoctors: 0, active: true },
];

async function seedDepartments() {
  try {
    const hospRes = await query('SELECT id, name FROM hospitals');
    console.log(`Found ${hospRes.rows.length} hospitals in DB:`, hospRes.rows.map(h => h.name));

    for (const hosp of hospRes.rows) {
      console.log(`Checking departments for ${hosp.name} (${hosp.id})...`);
      for (const dept of DEFAULT_DEPARTMENTS) {
        await query(
          `INSERT INTO hospital_departments (id, hospital_id, name, icon, head_doctor, total_doctors, active, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id, hospital_id) DO NOTHING`,
          [
            dept.id,
            hosp.id,
            dept.name,
            dept.icon,
            dept.headDoctor,
            dept.totalDoctors,
            dept.active,
            JSON.stringify(dept)
          ]
        );
      }
      const checkRes = await query('SELECT count(*) FROM hospital_departments WHERE hospital_id = $1', [hosp.id]);
      console.log(`Hospital ${hosp.name} (${hosp.id}) now has ${checkRes.rows[0].count} departments in RDS.`);
    }

    // Also update sync_store if global_store exists
    const storeRes = await query(`SELECT data FROM sync_store WHERE key = 'global_store'`);
    if (storeRes.rows.length > 0 && storeRes.rows[0].data) {
      const store = storeRes.rows[0].data;
      store.hospitalDepartments = store.hospitalDepartments || {};
      for (const hosp of hospRes.rows) {
        if (!store.hospitalDepartments[hosp.id] || store.hospitalDepartments[hosp.id].length === 0) {
          store.hospitalDepartments[hosp.id] = DEFAULT_DEPARTMENTS.map(d => ({ ...d }));
        } else {
          // Merge missing default departments
          DEFAULT_DEPARTMENTS.forEach(def => {
            const exists = store.hospitalDepartments[hosp.id].some(d => d.id === def.id || d.name?.toLowerCase() === def.name.toLowerCase());
            if (!exists) {
              store.hospitalDepartments[hosp.id].push({ ...def });
            }
          });
        }
      }
      await query(`UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'`, [JSON.stringify(store)]);
      console.log('✅ Updated sync_store global_store with default departments.');
    }

    console.log('🎉 Default departments seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error seeding departments:', err);
  } finally {
    await pool.end();
  }
}

seedDepartments();
