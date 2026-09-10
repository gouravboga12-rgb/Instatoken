/**
 * Geographic Hierarchy Definition & Location Targeting Engine
 * Country → State → District/City → Mandal → Village
 */

export type TargetLevel = 'country' | 'state' | 'district' | 'mandal' | 'village';

export interface GeoLocationDetails {
  country: string;
  state?: string;
  district?: string;
  mandal?: string;
  city?: string;
  village?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
}

export interface BannerRecord {
  id: string;
  title: string;
  description: string;
  image: string;
  badge?: string;
  linkUrl?: string;
  ctaText?: string;
  status: 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  targetLevel: TargetLevel;
  country: string;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
  displayPanels: ('customer' | 'hospital')[];
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Indian States & Union Territories ─────────────────────────────────────────
export const INDIAN_STATES: string[] = [
  'Telangana',
  'Andhra Pradesh',
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Kerala',
  'Delhi',
  'Gujarat',
  'Rajasthan',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'West Bengal',
  'Bihar',
  'Odisha',
  'Punjab',
  'Haryana',
  'Assam',
  'Chhattisgarh',
  'Jharkhand',
  'Uttarakhand',
  'Himachal Pradesh',
  'Goa',
  'Jammu & Kashmir',
  'Tripura',
  'Manipur',
  'Meghalaya',
  'Nagaland',
  'Mizoram',
  'Sikkim',
  'Arunachal Pradesh',
  'Puducherry',
  'Chandigarh'
];

// ─── Hierarchy Structure ───────────────────────────────────────────────────────
// State -> District -> Mandal -> Villages[]
export interface DistrictHierarchy {
  [district: string]: {
    [mandal: string]: string[];
  };
}

export const GEO_HIERARCHY: Record<string, DistrictHierarchy> = {
  'Telangana': {
    'Karimnagar': {
      'Karimnagar Mandal': [
        'Karimnagar City',
        'Arepalli',
        'Chintakunta',
        'Durshed',
        'Elgandal',
        'Rekurthi',
        'Theegalaguttapally',
        'Vallampally',
        'Mankammathota',
        'Mukarampura',
        'Kishan Nagar'
      ],
      'Choppadandi': [
        'Choppadandi Village',
        'Gumlapur',
        'Kolimikunta',
        'Rukmapur',
        'Arnakonda',
        'Chigurubakulapalli',
        'Vedira',
        'Ragojipeta'
      ],
      'Manakondur': [
        'Manakondur Village',
        'Gattududdenapally',
        'Pothireddypally',
        'Vemulapally',
        'Annaram',
        'Lingannapet',
        'Kondapalkala'
      ],
      'Gangadhara': [
        'Gangadhara',
        'Kurikyala',
        'Sarvareddypally',
        'Narayapur',
        'Venkatayapally'
      ],
      'Thimmapur': [
        'Thimmapur',
        'Alugunoor',
        'Nedunoor',
        'Nustulapur',
        'Mogiligidda'
      ],
      'Huzurabad': [
        'Huzurabad Town',
        'Bornapally',
        'Chelpur',
        'Kanaparthi',
        'Peddapapaiahpally'
      ],
      'Jammikunta': [
        'Jammikunta Town',
        'Abadi Jammikunta',
        'Nagampet',
        'Vavilala',
        'Tanugula'
      ],
      'Kothapalli': [
        'Kothapalli Haveli',
        'Asifnagar',
        'Chinthakunta',
        'Nagunur',
        'Rekonda'
      ],
      'Shankarapatnam': ['Keshavapatnam', 'Ambalpur', 'Kalleda', 'Vankayapally'],
      'Saidapur': ['Saidapur', 'Dharmaram', 'Venkatapur'],
      'Chigurumamidi': ['Chigurumamidi', 'Sundaragiri', 'Lammanapally'],
      'Ramadugu': ['Ramadugu', 'Deshrajpally', 'Velichala']
    },
    'Warangal': {
      'Warangal Mandal': ['Warangal City', 'Fort Warangal', 'Ursu', 'Bollikunta', 'Mamnoor'],
      'Hanamkonda': ['Hanamkonda Town', 'Kazipet', 'Nayeemnagar', 'Subedari', 'Waddepally', 'Kumarpally'],
      'Kazipet': ['Kazipet Railway Colony', 'Somidi', 'Madikonda', 'Rampur'],
      'Hasanparthy': ['Hasanparthy', 'Ananthasagar', 'Nagaram', 'Pegadapally'],
      'Geesugonda': ['Geesugonda', 'Gorrekunta', 'Mogilicherla'],
      'Wardhannapet': ['Wardhannapet', 'Inavolu', 'Kondarthy']
    },
    'Hyderabad': {
      'Serilingampally': ['Gachibowli', 'Madhapur', 'HITEC City', 'Kondapur', 'Hafeezpet', 'Chandanagar'],
      'Shaikpet': ['Banjara Hills', 'Jubilee Hills', 'Tolichowki', 'Film Nagar'],
      'Khairatabad': ['Khairatabad', 'Somajiguda', 'Panjagutta', 'Ameerpet'],
      'Kukatpally': ['Kukatpally Housing Board', 'KPHB Phase 1', 'Moosapet', 'Balnagar'],
      'Secunderabad': ['Secunderabad Station', 'Marredpally', 'Begumpet', 'Paradise', 'Trimulgherry'],
      'Charminar': ['Charminar', 'Laad Bazaar', 'Moghalpura', 'Falaknuma']
    },
    'Medchal-Malkajgiri': {
      'Malkajgiri': ['Malkajgiri Town', 'Neredmet', 'Safilguda', 'Moula Ali'],
      'Uppal': ['Uppal', 'Nacharam', 'Habsiguda', 'Ramanthapur'],
      'Alwal': ['Alwal', 'Lothkunta', 'Old Alwal', 'Macha Bolarum'],
      'Kompally': ['Kompally', 'Dulapally', 'Gundlapochampally', 'Medchal']
    },
    'Khammam': {
      'Khammam Urban': ['Khammam Town', 'Burhanpuram', 'Rotary Nagar', 'Khanapuram'],
      'Khammam Rural': ['Arempula', 'Gudimalla', 'Theldarupally', 'Edulapuram'],
      'Madhira': ['Madhira Town', 'Atkur', 'Rayapatnam'],
      'Wyra': ['Wyra Town', 'Somavaram', 'Gollapudi']
    },
    'Nizamabad': {
      'Nizamabad North': ['Nizamabad City', 'Vinayak Nagar', 'Subhashnagar'],
      'Nizamabad South': ['Khaleelwadi', 'Barkatpura', 'Dichpally'],
      'Bodhan': ['Bodhan Town', 'Rakaspura', 'Shakkarnagar'],
      'Armoor': ['Armoor Town', 'Perkit', 'Mamipally']
    },
    'Nalgonda': {
      'Nalgonda Mandal': ['Nalgonda Town', 'Arjalabavi', 'Chityal', 'Miryalaguda'],
      'Suryapet': ['Suryapet Town', 'Kudakuda', 'Pillalamarri'],
      'Kodad': ['Kodad Town', 'Komarabanda', 'Nadigudem']
    }
  },
  'Andhra Pradesh': {
    'Krishna': {
      'Vijayawada Urban': ['Governorpet', 'Benz Circle', 'Bhavanipuram', 'Patamata', 'Suryaraopet', 'One Town'],
      'Vijayawada Rural': ['Enikepadu', 'Nunna', 'Prasadampadu', 'Gollapudi'],
      'Gannavaram': ['Gannavaram Town', 'Airport Colony', 'Atkur', 'Peddavutapalli'],
      'Penamaluru': ['Penamaluru', 'Poranki', 'Kanuru', 'Yanamalakuduru']
    },
    'Visakhapatnam': {
      'Visakhapatnam Urban': ['Ram Nagar', 'MVP Colony', 'Siripuram', 'Jagadamba Centre', 'Dwaraka Nagar', 'Beach Road'],
      'Gajuwaka': ['Gajuwaka Town', 'Steel Plant Township', 'Kurmannapalem', 'Vadlapudi'],
      'Bheemunipatnam': ['Bheemili Beach', 'Tagarapuvalasa', 'Nidigattu', 'Kothavalasa']
    },
    'Guntur': {
      'Guntur Urban': ['Brodipet', 'Arundelpet', 'Kothapet', 'Old Guntur', 'Pattabhipuram'],
      'Tenali': ['Tenali Town', 'Chenchupet', 'Nazarpet', 'Morrispet'],
      'Mangalagiri': ['Mangalagiri Town', 'Nowlur', 'Kuragallu', 'Atmakur']
    }
  },
  'Karnataka': {
    'Bengaluru Urban': {
      'Bengaluru South': ['Koramangala', 'HSR Layout', 'Jayanagar', 'BTM Layout', 'JP Nagar', 'Electronic City', 'Bannerghatta'],
      'Bengaluru East': ['Indiranagar', 'Whitefield', 'Marathahalli', 'Bellandur', 'CV Raman Nagar', 'Varthur'],
      'Bengaluru North': ['Malleshwaram', 'Hebbal', 'Yelahanka', 'Yeshwanthpur', 'Sadashivanagar', 'RT Nagar']
    },
    'Mysuru': {
      'Mysuru Urban': ['Gokulam', 'Jayalakshmipuram', 'KRS Road', 'Vijayanagar', 'Saraswathipuram'],
      'Mysuru Rural': ['Varuna', 'Kadakola', 'Ilavala']
    }
  },
  'Maharashtra': {
    'Mumbai Suburban': {
      'Andheri': ['Andheri West', 'Andheri East', 'Lokhandwala', 'Juhu', 'Versova'],
      'Bandra': ['Bandra West', 'Bandra Kurla Complex (BKC)', 'Pali Hill', 'Khar'],
      'Borivali': ['Borivali West', 'Kandivali', 'IC Colony', 'Gorai']
    },
    'Pune': {
      'Pune City': ['Kothrud', 'Shivajinagar', 'Koregaon Park', 'Aundh', 'Viman Nagar'],
      'Haveli': ['Hadapsar', 'Wagholi', 'Magarpatta City', 'Kalyani Nagar']
    }
  },
  'Tamil Nadu': {
    'Chennai': {
      'Chennai Central': ['T. Nagar', 'Mylapore', 'Alwarpet', 'Nungambakkam'],
      'Chennai South': ['Adyar', 'Besant Nagar', 'Velachery', 'Thiruvanmiyur', 'OMR']
    }
  },
  'Delhi': {
    'Central Delhi': {
      'Connaught Place': ['CP Inner Circle', 'Janpath', 'Barakhamba Road', 'Bengali Market']
    },
    'South Delhi': {
      'Hauz Khas': ['Hauz Khas Enclave', 'Green Park', 'Safdarjung', 'Greater Kailash']
    }
  }
};

// ─── Query Helper Functions ────────────────────────────────────────────────────

export function getStates(country: string = 'India'): string[] {
  if (country.toLowerCase() !== 'india') return [];
  return INDIAN_STATES;
}

export function getDistricts(_country: string = 'India', state?: string): string[] {
  if (!state) return [];
  const stateData = GEO_HIERARCHY[state];
  if (stateData) return Object.keys(stateData);

  // Fallback defaults for other Indian states
  const FALLBACK_DISTRICTS: Record<string, string[]> = {
    'Kerala': ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Noida', 'Agra', 'Prayagraj'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'],
    'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri', 'Durgapur'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar']
  };

  return FALLBACK_DISTRICTS[state] || [`Central ${state}`, `North ${state}`, `South ${state}`];
}

export function getMandals(_country: string = 'India', state?: string, district?: string): string[] {
  if (!state || !district) return [];
  const stateData = GEO_HIERARCHY[state];
  if (stateData && stateData[district]) {
    return Object.keys(stateData[district]);
  }
  return [`${district} Urban`, `${district} Rural`, `${district} North`, `${district} South`];
}

export function getVillages(_country: string = 'India', state?: string, district?: string, mandal?: string): string[] {
  if (!state || !district || !mandal) return [];
  const stateData = GEO_HIERARCHY[state];
  if (stateData && stateData[district] && stateData[district][mandal]) {
    return stateData[district][mandal];
  }
  return [`${mandal} Town`, `Central ${mandal}`, `Village 1`, `Village 2`];
}

/**
 * Searches across the hierarchy for autocomplete suggestions.
 */
export function searchLocations(query: string): Array<{
  level: TargetLevel;
  label: string;
  country: string;
  state?: string;
  district?: string;
  mandal?: string;
  village?: string;
}> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const results: Array<{
    level: TargetLevel;
    label: string;
    country: string;
    state?: string;
    district?: string;
    mandal?: string;
    village?: string;
  }> = [];

  // Match states
  INDIAN_STATES.forEach(state => {
    if (state.toLowerCase().includes(q)) {
      results.push({
        level: 'state',
        label: `${state}, India`,
        country: 'India',
        state
      });
    }
  });

  // Match districts, mandals, and villages
  Object.keys(GEO_HIERARCHY).forEach(state => {
    const districts = GEO_HIERARCHY[state];
    Object.keys(districts).forEach(dist => {
      if (dist.toLowerCase().includes(q)) {
        results.push({
          level: 'district',
          label: `${dist} District, ${state}`,
          country: 'India',
          state,
          district: dist
        });
      }

      const mandals = districts[dist];
      Object.keys(mandals).forEach(mandal => {
        if (mandal.toLowerCase().includes(q)) {
          results.push({
            level: 'mandal',
            label: `${mandal}, ${dist}, ${state}`,
            country: 'India',
            state,
            district: dist,
            mandal
          });
        }

        const villages = mandals[mandal];
        villages.forEach(village => {
          if (village.toLowerCase().includes(q)) {
            results.push({
              level: 'village',
              label: `${village}, ${mandal}, ${dist}`,
              country: 'India',
              state,
              district: dist,
              mandal,
              village
            });
          }
        });
      });
    });
  });

  return results.slice(0, 10);
}

/**
 * Helper to normalize string comparisons (case-insensitive, trims, removes 'district'/'mandal' suffix if needed)
 */
function cleanGeoStr(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(district|dist|mandal|town|city|village)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Core Matching Engine: Checks if a banner targeted to a geographic level
 * is visible to a customer located at customerLocation.
 * 
 * Hierarchy Rules:
 * - Country: All customers in that country match.
 * - State: All customers in that state match (including all districts, mandals, villages).
 * - District: All customers in that district match (including all mandals, villages).
 * - Mandal: All customers in that mandal match (including all villages under it).
 * - Village: Only customers in that specific village/locality match.
 * 
 * Strict Isolation: Never show a location-specific banner to customers outside its targeted area.
 */
export function matchLocationHierarchy(
  banner: {
    targetLevel: TargetLevel;
    country?: string;
    state?: string;
    district?: string;
    mandal?: string;
    village?: string;
  },
  customer: GeoLocationDetails
): boolean {
  if (!banner) return false;

  const bCountry = cleanGeoStr(banner.country || 'India');
  const cCountry = cleanGeoStr(customer.country || 'India');

  // Country mismatch
  if (bCountry && cCountry && bCountry !== cCountry) {
    return false;
  }

  // 1. Country-Level Target
  if (banner.targetLevel === 'country') {
    return true;
  }

  const bState = cleanGeoStr(banner.state);
  const cState = cleanGeoStr(customer.state);

  // State mismatch
  if (bState && cState && bState !== cState) {
    return false;
  }
  if (bState && !cState) {
    return false; // Customer state unknown, cannot prove state membership
  }

  // 2. State-Level Target
  if (banner.targetLevel === 'state') {
    return bState === cState;
  }

  const bDistrict = cleanGeoStr(banner.district);
  const cDistrict = cleanGeoStr(customer.district);
  const cCity = cleanGeoStr(customer.city);

  // Check district / city match
  const districtMatches = Boolean(
    bDistrict && (
      (cDistrict && (bDistrict === cDistrict || cDistrict.includes(bDistrict) || bDistrict.includes(cDistrict))) ||
      (cCity && (bDistrict === cCity || cCity.includes(bDistrict) || bDistrict.includes(cCity)))
    )
  );

  if (!districtMatches) {
    return false;
  }

  // 3. District-Level Target
  if (banner.targetLevel === 'district') {
    return true; // District matches, covers all mandals, towns, and villages under it!
  }

  const bMandal = cleanGeoStr(banner.mandal);
  const cMandal = cleanGeoStr(customer.mandal);

  const mandalMatches = Boolean(
    bMandal && cMandal && (
      bMandal === cMandal ||
      cMandal.includes(bMandal) ||
      bMandal.includes(cMandal)
    )
  );

  if (!mandalMatches) {
    return false;
  }

  // 4. Mandal-Level Target
  if (banner.targetLevel === 'mandal') {
    return true; // Mandal matches, covers all villages under it!
  }

  // 5. Village-Level Target
  if (banner.targetLevel === 'village') {
    const bVillage = cleanGeoStr(banner.village);
    const cVillage = cleanGeoStr(customer.village);
    const cAddress = cleanGeoStr(customer.formattedAddress);

    return Boolean(
      bVillage && (
        (cVillage && (bVillage === cVillage || cVillage.includes(bVillage) || bVillage.includes(cVillage))) ||
        (cAddress && cAddress.includes(bVillage))
      )
    );
  }

  return false;
}
