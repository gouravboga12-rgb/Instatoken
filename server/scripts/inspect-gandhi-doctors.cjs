const fs = require('fs');
const readline = require('readline');

async function inspectGandhi() {
  const fileStream = fs.createReadStream('instatoken_dump.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('hosp-mu0838sg')) {
      if (line.startsWith('INSERT INTO "hospitals"')) {
        console.log('\n--- HOSPITAL ---');
        console.log(line);
      } else if (line.startsWith('INSERT INTO "hospital_doctors"')) {
        console.log('\n--- DOCTOR ---');
        console.log(line);
      }
    }
  }
}

inspectGandhi();
