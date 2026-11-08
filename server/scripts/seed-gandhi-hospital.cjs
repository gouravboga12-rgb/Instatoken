const { query, pool } = require('../config/db.js');

async function seedGandhiHospital() {
  console.log('🏥 Seeding Gandhi Hospital and its doctor profiles for testing...');
  try {
    const hospId = 'hosp-gandhi';
    const hospName = 'Gandhi Hospital';

    const hospitalData = {
      id: hospId,
      name: hospName,
      type: 'General Hospital',
      category: 'Multi-Specialty Hospital',
      emergency24x7: true,
      city: 'Secunderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      pincode: '500003',
      address: 'Musheerabad, Bhoiguda, Secunderabad, Telangana 500003',
      phone: '+91 40 2750 5566',
      email: 'admin@gandhihospital.org',
      website: 'https://gandhihospital.telangana.gov.in',
      about: 'Gandhi Hospital is a premier tertiary care government teaching hospital in Secunderabad, Telangana.',
      logo: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&q=80&w=250',
      coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000',
      active: true,
      rating: 4.8,
      totalReviews: 240,
      totalDoctors: 4,
      totalBeds: 1200,
      departments: [
        { id: 'dept-genmed', name: 'General Medicine', icon: '🩺', headDoctor: 'Dr. V. Ramesh', totalDoctors: 1, active: true },
        { id: 'dept-cardio', name: 'Cardiology', icon: '❤️', headDoctor: 'Dr. Sunita Rao', totalDoctors: 1, active: true },
        { id: 'dept-pedia', name: 'Pediatrics', icon: '👶', headDoctor: 'Dr. K. Srinivas', totalDoctors: 1, active: true },
        { id: 'dept-ortho', name: 'Orthopedics', icon: '🦴', headDoctor: 'Dr. P. Anitha', totalDoctors: 1, active: true }
      ]
    };

    // 1. Insert or update hospitals table
    await query(
      `INSERT INTO hospitals (id, name, logo_url, cover_image_url, email, phone, city, state, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO UPDATE SET name = $2, logo_url = $3, cover_image_url = $4, email = $5, phone = $6, city = $7, state = $8, data = $9, updated_at = NOW()`,
      [hospId, hospName, hospitalData.logo, hospitalData.coverImage, hospitalData.email, hospitalData.phone, hospitalData.city, hospitalData.state, JSON.stringify(hospitalData)]
    );
    console.log('✅ Gandhi Hospital record saved.');

    // 2. Insert or update hospital_profiles table
    await query(
      `INSERT INTO hospital_profiles (hospital_id, profile_data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (hospital_id) DO UPDATE SET profile_data = $2, updated_at = NOW()`,
      [hospId, JSON.stringify(hospitalData)]
    );
    console.log('✅ Gandhi Hospital profile saved.');

    // 3. Doctors list
    const doctors = [
      {
        id: 'doc-gandhi-101',
        hospitalId: hospId,
        name: 'Dr. V. Ramesh',
        specialization: 'General Physician',
        qualification: 'MBBS, MD (General Medicine)',
        experience: 16,
        departmentId: 'dept-genmed',
        departmentName: 'General Medicine',
        roomNo: 'OPD-101',
        consultationFee: 250,
        rating: 4.8,
        totalPatients: 840,
        active: true,
        photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
        sessions: [
          { id: 'sess-morning', name: 'Morning', startTime: '09:00', endTime: '13:00', maxTokens: 40, tokenDuration: 10 },
          { id: 'sess-evening', name: 'Evening', startTime: '17:00', endTime: '21:00', maxTokens: 30, tokenDuration: 10 }
        ]
      },
      {
        id: 'doc-gandhi-102',
        hospitalId: hospId,
        name: 'Dr. Sunita Rao',
        specialization: 'Senior Cardiologist',
        qualification: 'MBBS, DM (Cardiology), FACC',
        experience: 20,
        departmentId: 'dept-cardio',
        departmentName: 'Cardiology',
        roomNo: 'OPD-204',
        consultationFee: 400,
        rating: 4.9,
        totalPatients: 1250,
        active: true,
        photo: 'https://images.unsplash.com/photo-1594824813511-193e7df5d436?auto=format&fit=crop&q=80&w=250',
        sessions: [
          { id: 'sess-morning', name: 'Morning', startTime: '10:00', endTime: '14:00', maxTokens: 30, tokenDuration: 15 }
        ]
      },
      {
        id: 'doc-gandhi-103',
        hospitalId: hospId,
        name: 'Dr. K. Srinivas',
        specialization: 'Pediatric Specialist',
        qualification: 'MBBS, DCH, MD (Pediatrics)',
        experience: 12,
        departmentId: 'dept-pedia',
        departmentName: 'Pediatrics',
        roomNo: 'OPD-108',
        consultationFee: 200,
        rating: 4.7,
        totalPatients: 620,
        active: true,
        photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250',
        sessions: [
          { id: 'sess-morning', name: 'Morning', startTime: '09:30', endTime: '13:30', maxTokens: 35, tokenDuration: 10 },
          { id: 'sess-evening', name: 'Evening', startTime: '18:00', endTime: '21:00', maxTokens: 25, tokenDuration: 10 }
        ]
      },
      {
        id: 'doc-gandhi-104',
        hospitalId: hospId,
        name: 'Dr. P. Anitha',
        specialization: 'Orthopedic Surgeon',
        qualification: 'MBBS, MS (Orthopedics)',
        experience: 14,
        departmentId: 'dept-ortho',
        departmentName: 'Orthopedics',
        roomNo: 'OPD-302',
        consultationFee: 300,
        rating: 4.8,
        totalPatients: 710,
        active: true,
        photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
        sessions: [
          { id: 'sess-morning', name: 'Morning', startTime: '09:00', endTime: '13:00', maxTokens: 30, tokenDuration: 12 }
        ]
      }
    ];

    for (const doc of doctors) {
      await query(
        `INSERT INTO hospital_doctors (id, hospital_id, name, specialization, department_id, department_name, photo_url, qualification, experience, consultation_fee, rating, total_patients, active, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         ON CONFLICT (id) DO UPDATE SET name = $3, specialization = $4, department_id = $5, department_name = $6, photo_url = $7, qualification = $8, experience = $9, consultation_fee = $10, active = $13, data = $14, updated_at = NOW()`,
        [doc.id, hospId, doc.name, doc.specialization, doc.departmentId, doc.departmentName, doc.photo, doc.qualification, doc.experience, doc.consultationFee, doc.rating, doc.totalPatients, doc.active, JSON.stringify(doc)]
      );
    }
    console.log(`✅ Seeded ${doctors.length} doctors for Gandhi Hospital.`);

    // 4. Update sync_store global_store
    const storeRes = await query(`SELECT data FROM sync_store WHERE key = 'global_store'`);
    if (storeRes.rows.length > 0 && storeRes.rows[0].data) {
      const store = storeRes.rows[0].data;
      store.hospitals = store.hospitals || [];
      const hospIdx = store.hospitals.findIndex(h => h.id === hospId);
      if (hospIdx >= 0) store.hospitals[hospIdx] = hospitalData;
      else store.hospitals.push(hospitalData);

      store.hospitalProfiles = store.hospitalProfiles || {};
      store.hospitalProfiles[hospId] = hospitalData;

      store.hospitalDoctors = store.hospitalDoctors || {};
      store.hospitalDoctors[hospId] = doctors;

      await query(
        `UPDATE sync_store SET data = $1, last_updated = NOW() WHERE key = 'global_store'`,
        [JSON.stringify(store)]
      );
      console.log('✅ Global store snapshot updated with Gandhi Hospital.');
    }

    console.log('🎉 Gandhi Hospital successfully initialized and ready for doctor screen testing!');
  } catch (err) {
    console.error('❌ Error seeding Gandhi Hospital:', err);
  } finally {
    await pool.end();
  }
}

seedGandhiHospital();
