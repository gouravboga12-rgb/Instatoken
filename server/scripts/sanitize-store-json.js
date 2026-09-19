const fs = require('fs');
const path = require('path');

const storeFile = path.join(__dirname, '../data/store.json');

if (!fs.existsSync(storeFile)) {
  console.log('No store.json found at:', storeFile);
  process.exit(0);
}

let content = fs.readFileSync(storeFile, 'utf8');
console.log('Original Apollo matches in store.json:', (content.match(/apollo/gi) || []).length);

// Replace all brand names, emails, and references
content = content
  .replace(/Apollo Spectra Hospital/g, 'City Care Multi-Specialty Hospital')
  .replace(/Apollo Hospital Jubilee Hills/g, 'City Care Hospital Jubilee Hills')
  .replace(/Apollo Hospital/g, 'City Care Hospital')
  .replace(/Apollo Spectra/g, 'City Care Hospital')
  .replace(/admin@apollo\.com/g, 'admin@instatoken.in')
  .replace(/info@apollospectra\.com/g, 'info@instatoken.in')
  .replace(/admin@apollospectra\.com/g, 'admin@instatoken.in')
  .replace(/www\.apollospectra\.com/g, 'https://testcodtech.shop')
  .replace(/apollo-hospitals-jubilee-hills-hyderabad\.jpg/g, 'hospital-building.jpg')
  .replace(/doc-apollo-1/g, 'doc-citycare-1');

fs.writeFileSync(storeFile, content, 'utf8');

const remaining = (content.match(/apollo/gi) || []).length;
console.log('Sanitized store.json. Remaining Apollo matches (should only be hosp-apollo IDs):', remaining);

// Print remaining match contexts
const matches = content.match(/.{0,25}apollo.{0,25}/gi) || [];
console.log('Remaining match snippets:', matches);
