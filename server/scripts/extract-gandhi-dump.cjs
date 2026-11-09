const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('instatoken_dump.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let hospitalLine = null;
  let profileLine = null;
  const doctorLines = [];
  const deptLines = [];
  const scheduleLines = [];
  const appointmentLines = [];
  const tokenLines = [];
  let globalStoreLine = null;

  for await (const line of rl) {
    if (line.includes('hosp-mu0838sg')) {
      if (line.startsWith('INSERT INTO "hospitals"')) hospitalLine = line;
      else if (line.startsWith('INSERT INTO "hospital_profiles"')) profileLine = line;
      else if (line.startsWith('INSERT INTO "hospital_doctors"')) doctorLines.push(line);
      else if (line.startsWith('INSERT INTO "hospital_departments"')) deptLines.push(line);
      else if (line.startsWith('INSERT INTO "hospital_schedules"')) scheduleLines.push(line);
      else if (line.startsWith('INSERT INTO "appointments"')) appointmentLines.push(line);
      else if (line.startsWith('INSERT INTO "tokens"')) tokenLines.push(line);
    }
    if (line.startsWith('INSERT INTO "sync_store"') && line.includes('global_store')) {
      globalStoreLine = line;
    }
  }

  console.log('--- FOUND GANDHI DATA IN instatoken_dump.sql ---');
  console.log('Hospital Record found:', Boolean(hospitalLine));
  console.log('Profile Record found:', Boolean(profileLine));
  console.log('Doctors count in dump:', doctorLines.length);
  console.log('Departments count in dump:', deptLines.length);
  console.log('Schedules count in dump:', scheduleLines.length);
  console.log('Appointments count in dump:', appointmentLines.length);
  console.log('Tokens count in dump:', tokenLines.length);

  // If doctors are inside profile_data or global_store, inspect that:
  if (profileLine) {
    // Regex extract JSON from VALUES ('id', 'JSON', ...)
    const match = profileLine.match(/VALUES \('[^']+', '(.*)', '[^']+'\);$/);
    if (match && match[1]) {
      try {
        const rawJson = match[1].replace(/''/g, "'").replace(/\\\\/g, "\\");
        const profile = JSON.parse(rawJson);
        console.log('\n--- PROFILE DETAILS ---');
        console.log('ID:', profile.id);
        console.log('Name:', profile.name);
        console.log('Email:', profile.email);
        console.log('Phone:', profile.phone);
        console.log('City:', profile.city);
        console.log('Address:', profile.address);
        console.log('Doctors inside profile:', Array.isArray(profile.doctors) ? profile.doctors.length : 'none');
        if (Array.isArray(profile.doctors)) {
          profile.doctors.forEach(d => console.log('  Doc:', d.id, d.name, d.specialty || d.specialization));
        }
      } catch (e) {
        console.log('Could not parse profile json:', e.message);
      }
    }
  }

  // Also check global_store for hosp-mu0838sg doctors & staff & schedules
  if (globalStoreLine) {
    const gMatch = globalStoreLine.match(/VALUES \('global_store', '(.*)', NOW\(\)\);$/) ||
                   globalStoreLine.match(/VALUES \('global_store', '(.*)', '[^']+'\);$/);
    if (gMatch && gMatch[1]) {
      try {
        const gJson = gMatch[1].replace(/''/g, "'").replace(/\\\\/g, "\\");
        const gStore = JSON.parse(gJson);
        const gDoc = gStore.hospitalDoctors?.['hosp-mu0838sg'];
        console.log('\n--- GLOBAL STORE DATA ---');
        console.log('Doctors for hosp-mu0838sg in global_store:', Array.isArray(gDoc) ? gDoc.length : 0);
        if (Array.isArray(gDoc)) {
          gDoc.forEach(d => console.log('  Doc:', d.id, d.name, d.specialization));
        }
        const gSched = gStore.hospitalSchedules?.['hosp-mu0838sg'];
        console.log('Schedule present:', Boolean(gSched));
        const gStaff = gStore.hospitalStaff?.['hosp-mu0838sg'];
        console.log('Staff count:', Array.isArray(gStaff) ? gStaff.length : 0);
        const gHosp = (gStore.hospitals || []).find(h => h.id === 'hosp-mu0838sg');
        if (gHosp) {
          console.log('Hospital in store.hospitals: Name =', gHosp.name, 'Doctors =', gHosp.doctors?.length);
          if (Array.isArray(gHosp.doctors)) {
            gHosp.doctors.forEach(d => console.log('   Hosp Doc:', d.id, d.name, d.specialty));
          }
        }
      } catch (e) {
        console.log('Could not parse global store json:', e.message);
      }
    }
  }
}

extract();

