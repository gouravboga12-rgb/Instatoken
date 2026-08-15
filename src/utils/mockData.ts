export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  departmentId: string;
  qualification: string;
  experience: number;
  consultationFee: number;
  rating: number;
  reviewsCount: number;
  image: string;
  availability: {
    days: string[];
    slots: string[];
  };
  currentQueue: number; // e.g., current token number being served
  nextAvailableToken: number; // e.g., next token that will be assigned
  estimatedWaitPerPatient: number; // in minutes
}

export interface Department {
  id: string;
  name: string;
  icon: string;
}

export interface Hospital {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  distance: number; // in km
  baseWaitingTime: number; // in minutes
  address: string;
  image: string;
  gallery: string[];
  about: string;
  facilities: string[];
  departments: Department[];
  doctors: Doctor[];
  timings: string;
  contact: string;
  lat: number;
  lng: number;
  status?: 'active' | 'disabled';
}

export interface CustomerBooking {
  id: string;
  tokenNumber: number;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  departmentName: string;
  date: string;
  time: string;
  fee: number;
  status: 'booked' | 'completed' | 'cancelled';
  paymentId: string;
  paymentMethod: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinedDate: string;
  status: 'active' | 'suspended';
  avatar?: string;
  bookings: CustomerBooking[];
}

export interface HealthArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  image: string;
  content: string;
  date: string;
}

// Inline high-quality SVG fallback generator for hospitals (never falls back to plain initials text)
export const getHospitalSVGImage = (name: string) => {
  const shortName = name.replace("Hospital", "").replace("Spectra", "").replace("Children's", "").trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="none">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E0F2FE"/>
        <stop offset="100%" stop-color="#BAE6FD"/>
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2563EB"/>
        <stop offset="100%" stop-color="#1D4ED8"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#sky)"/>
    <rect x="0" y="380" width="800" height="120" fill="#94A3B8"/>
    <rect x="0" y="390" width="800" height="8" fill="#E2E8F0"/>
    
    <!-- Main Hospital Building Structure -->
    <rect x="180" y="100" width="440" height="280" rx="16" fill="url(#glass)"/>
    <rect x="200" y="120" width="400" height="240" rx="12" fill="#FFFFFF"/>
    
    <!-- Cross Header Badge -->
    <rect x="330" y="60" width="140" height="50" rx="12" fill="#2563EB"/>
    <path d="M400 72V98M387 85H413" stroke="white" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Windows Grid -->
    <rect x="230" y="150" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="310" y="150" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="390" y="150" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="470" y="150" width="60" height="45" rx="6" fill="#38BDF8"/>
    
    <rect x="230" y="220" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="310" y="220" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="390" y="220" width="60" height="45" rx="6" fill="#38BDF8"/>
    <rect x="470" y="220" width="60" height="45" rx="6" fill="#38BDF8"/>
    
    <!-- Entrance Glass Doors -->
    <rect x="350" y="290" width="100" height="70" rx="6" fill="#0F172A"/>
    <rect x="355" y="295" width="42" height="65" fill="#38BDF8" opacity="0.8"/>
    <rect x="403" y="295" width="42" height="65" fill="#38BDF8" opacity="0.8"/>
    
    <!-- Hospital Name Banner -->
    <rect x="150" y="420" width="500" height="50" rx="25" fill="#FFFFFF" stroke="#2563EB" stroke-width="3"/>
    <text x="400" y="452" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="#1E40AF" text-anchor="middle">${shortName} Hospital</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const CATEGORIES = [
  "Multi Speciality",
  "Children Hospital",
  "Eye Hospital",
  "Dental Clinic",
  "Orthopedic",
  "Cardiology",
  "Neurology",
  "ENT",
  "Gynecology",
  "General Medicine"
];

export const DEPARTMENTS: Department[] = [
  { id: "dept-general", name: "General Medicine", icon: "Stethoscope" },
  { id: "dept-cardio", name: "Cardiology", icon: "Heart" },
  { id: "dept-ortho", name: "Orthopedic", icon: "Activity" },
  { id: "dept-pedia", name: "Pediatrics", icon: "Baby" },
  { id: "dept-dental", name: "Dental Care", icon: "Smile" },
  { id: "dept-eye", name: "Ophthalmology", icon: "Eye" },
  { id: "dept-neuro", name: "Neurology", icon: "Brain" },
  { id: "dept-gynaec", name: "Gynecology", icon: "Users" }
];

export const HOSPITALS: Hospital[] = [
  {
    id: "hosp-apollo",
    name: "Apollo Spectra Hospital",
    category: "Multi Speciality",
    rating: 4.8,
    reviewsCount: 1240,
    distance: 1.8,
    baseWaitingTime: 20,
    address: "Koramangala 5th Block, near Sony World Signal, Bengaluru",
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Apollo Spectra is a state-of-the-art multi-specialty hospital committed to bringing you the best clinical outcomes in a simplified, service-oriented environment. Equipped with advanced diagnostic infrastructure and led by top healthcare specialists.",
    facilities: ["24/7 Emergency", "ICU", "Pharmacy", "Ambulance", "Lab Testing", "Cafeteria"],
    departments: [
      DEPARTMENTS[0], // General
      DEPARTMENTS[1], // Cardio
      DEPARTMENTS[2], // Ortho
      DEPARTMENTS[6]  // Neuro
    ],
    timings: "Open 24 Hours (OPD: 09:00 AM - 05:00 PM)",
    contact: "+91 80 4668 8888",
    lat: 12.9348,
    lng: 77.6189,
    doctors: [
      {
        id: "doc-arvind",
        name: "Dr. Arvind Sharma",
        specialty: "Interventional Cardiologist",
        departmentId: "dept-cardio",
        qualification: "MD, DM (Cardiology), FACC",
        experience: 16,
        consultationFee: 800,
        rating: 4.9,
        reviewsCount: 312,
        image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "02:00 PM", "02:30 PM", "03:00 PM"]
        },
        currentQueue: 5,
        nextAvailableToken: 9,
        estimatedWaitPerPatient: 12
      },
      {
        id: "doc-sarah",
        name: "Dr. Sarah Jenkins",
        specialty: "Consultant Neurologist",
        departmentId: "dept-neuro",
        qualification: "MBBS, DM (Neurology)",
        experience: 12,
        consultationFee: 1000,
        rating: 4.7,
        reviewsCount: 184,
        image: "https://images.unsplash.com/photo-1594824813573-246434de83fb?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Wed", "Fri"],
          slots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "03:00 PM", "03:30 PM", "04:00 PM"]
        },
        currentQueue: 2,
        nextAvailableToken: 6,
        estimatedWaitPerPatient: 15
      },
      {
        id: "doc-ramesh",
        name: "Dr. Ramesh Patel",
        specialty: "Joint Replacement Specialist",
        departmentId: "dept-ortho",
        qualification: "MS (Ortho), MCh (Ortho)",
        experience: 18,
        consultationFee: 900,
        rating: 4.8,
        reviewsCount: 220,
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Tue", "Thu", "Sat"],
          slots: ["09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"]
        },
        currentQueue: 8,
        nextAvailableToken: 12,
        estimatedWaitPerPatient: 10
      }
    ]
  },
  {
    id: "hosp-rainbow",
    name: "Rainbow Children's Hospital",
    category: "Children Hospital",
    rating: 4.7,
    reviewsCount: 932,
    distance: 3.2,
    baseWaitingTime: 15,
    address: "HSR Layout Sector 2, opposite HSR Club, Bengaluru",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1502740479091-63bc883e082f?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Rainbow Children's Hospital is Bengaluru's premier pediatric and neonatal intensive care provider. Offering colorfully themed child-friendly waiting rooms, specialized play zones, and world-class care by leading pediatricians.",
    facilities: ["24/7 Neonatal Emergency", "Child Play Zone", "Pediatric ICU", "Ambulance", "Pediatric Pharmacy"],
    departments: [
      DEPARTMENTS[3], // Pediatrics
      DEPARTMENTS[4]  // Dental Care
    ],
    timings: "Open 24 Hours (OPD: 08:30 AM - 06:00 PM)",
    contact: "+91 80 4220 2202",
    lat: 12.9105,
    lng: 77.6450,
    doctors: [
      {
        id: "doc-carter",
        name: "Dr. John Carter",
        specialty: "Senior Consultant Pediatrician",
        departmentId: "dept-pedia",
        qualification: "MD (Pediatrics), Fellowship in Neonatology",
        experience: 14,
        consultationFee: 600,
        rating: 4.9,
        reviewsCount: 450,
        image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          slots: ["09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM", "12:00 PM", "03:00 PM", "03:45 PM", "04:30 PM", "05:15 PM"]
        },
        currentQueue: 11,
        nextAvailableToken: 15,
        estimatedWaitPerPatient: 8
      },
      {
        id: "doc-meera-dental",
        name: "Dr. Anjali Rao",
        specialty: "Pediatric Dentist",
        departmentId: "dept-dental",
        qualification: "BDS, MDS (Pedodontics)",
        experience: 9,
        consultationFee: 500,
        rating: 4.6,
        reviewsCount: 98,
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Wed", "Fri"],
          slots: ["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"]
        },
        currentQueue: 1,
        nextAvailableToken: 4,
        estimatedWaitPerPatient: 15
      }
    ]
  },
  {
    id: "hosp-nethra",
    name: "Narayana Nethralaya",
    category: "Eye Hospital",
    rating: 4.9,
    reviewsCount: 1650,
    distance: 4.5,
    baseWaitingTime: 35,
    address: "Indiranagar 100ft Road, near Metro Station, Bengaluru",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Narayana Nethralaya is an ultra-modern eye care hospital offering state-of-the-art diagnostics and surgeries. From LASIK and cataracts to complex retinal treatments, we keep your vision crystal clear.",
    facilities: ["Advanced Diagnostics", "Lasik Wing", "Daycare Surgery", "Optical Shop", "Contact Lens Lab"],
    departments: [
      DEPARTMENTS[5] // Ophthalmology (Eye)
    ],
    timings: "08:00 AM - 07:00 PM",
    contact: "+91 80 6612 1400",
    lat: 12.9719,
    lng: 77.6412,
    doctors: [
      {
        id: "doc-shalini",
        name: "Dr. Shalini Sen",
        specialty: "Cataract & Refractive Surgeon",
        departmentId: "dept-eye",
        qualification: "MBBS, MS (Ophth), Fellow in Cornea",
        experience: 11,
        consultationFee: 650,
        rating: 4.9,
        reviewsCount: 382,
        image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"]
        },
        currentQueue: 14,
        nextAvailableToken: 21,
        estimatedWaitPerPatient: 6
      }
    ]
  },
  {
    id: "hosp-fortis",
    name: "Fortis Hospital",
    category: "Cardiology",
    rating: 4.6,
    reviewsCount: 884,
    distance: 5.1,
    baseWaitingTime: 45,
    address: "Bannerghatta Road, opposite IIM-B, Bengaluru",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1586773860418-d3b3da96a362?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Fortis Hospital, Bannerghatta Road, is a renowned multi-specialty healthcare provider offering cutting-edge therapies in cardiology, cardio-thoracic surgeries, neurology, and orthopedics.",
    facilities: ["24/7 Emergency Care", "Cardiac ICU", "Blood Bank", "Cafeteria", "Pharmacy Hub", "Surgical Suites"],
    departments: [
      DEPARTMENTS[1], // Cardio
      DEPARTMENTS[2], // Ortho
      DEPARTMENTS[7]  // Gynecology
    ],
    timings: "Open 24 Hours (OPD: 09:30 AM - 04:30 PM)",
    contact: "+91 80 6620 2200",
    lat: 12.8954,
    lng: 77.5997,
    doctors: [
      {
        id: "doc-meera-gyn",
        name: "Dr. Meera Nair",
        specialty: "High-Risk Pregnancy Specialist",
        departmentId: "dept-gynaec",
        qualification: "MBBS, DGO, MD (Obstetrics & Gynecology)",
        experience: 15,
        consultationFee: 700,
        rating: 4.8,
        reviewsCount: 290,
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Thu", "Fri"],
          slots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "03:00 PM", "03:30 PM", "04:00 PM"]
        },
        currentQueue: 4,
        nextAvailableToken: 8,
        estimatedWaitPerPatient: 12
      }
    ]
  },
  {
    id: "hosp-continental",
    name: "Continental Hospitals",
    category: "Multi Speciality",
    rating: 4.7,
    reviewsCount: 940,
    distance: 2.1,
    baseWaitingTime: 15,
    address: "Financial District, Gachibowli, Hyderabad",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Continental Hospitals is a JCI and NABH accredited multi-specialty hospital in Hyderabad, offering state-of-the-art diagnostic and clinical care across various medical departments.",
    facilities: ["24/7 Emergency Care", "ICU", "Ambulance Services", "Pharmacy Hub", "Surgical Desks"],
    departments: [
      DEPARTMENTS[0],
      DEPARTMENTS[6],
      DEPARTMENTS[7]
    ],
    timings: "Open 24 Hours (OPD: 10:00 AM - 05:00 PM)",
    contact: "+91 40 6700 0000",
    lat: 17.4123,
    lng: 78.3264,
    doctors: [
      {
        id: "doc-raghava-neuro",
        name: "Dr. Raghava Rao",
        specialty: "Senior Neurologist",
        departmentId: "dept-neuro",
        qualification: "MD, DM (Neurology)",
        experience: 18,
        consultationFee: 900,
        rating: 4.8,
        reviewsCount: 140,
        image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          slots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM"]
        },
        currentQueue: 2,
        nextAvailableToken: 5,
        estimatedWaitPerPatient: 10
      },
      {
        id: "doc-sirisha-gyn",
        name: "Dr. Sirisha Reddy",
        specialty: "Consultant Gynecologist",
        departmentId: "dept-gynaec",
        qualification: "MBBS, MD (Obstetrics & Gynecology)",
        experience: 12,
        consultationFee: 750,
        rating: 4.7,
        reviewsCount: 95,
        image: "https://images.unsplash.com/photo-1594824813573-246434de83fb?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Wed", "Fri"],
          slots: ["02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM"]
        },
        currentQueue: 1,
        nextAvailableToken: 4,
        estimatedWaitPerPatient: 15
      }
    ]
  },
  {
    id: "hosp-ramesh",
    name: "Ramesh Hospitals",
    category: "Cardiology",
    rating: 4.7,
    reviewsCount: 780,
    distance: 1.2,
    baseWaitingTime: 10,
    address: "ITI Road, Near Benz Circle, Vijayawada",
    image: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Ramesh Hospitals is a leading cardiac care provider in Andhra Pradesh, delivering advanced cardiology and emergency critical care services.",
    facilities: ["Cardiac ICU", "24/7 Trauma Care", "Pharmacy Hub", "Diagnostic Lab", "Ambulance"],
    departments: [
      DEPARTMENTS[0],
      DEPARTMENTS[1]
    ],
    timings: "Open 24 Hours (OPD: 09:30 AM - 04:30 PM)",
    contact: "+91 866 244 4444",
    lat: 16.5062,
    lng: 80.6480,
    doctors: [
      {
        id: "doc-ramesh-babu",
        name: "Dr. Ramesh Babu",
        specialty: "Interventional Cardiologist",
        departmentId: "dept-cardio",
        qualification: "MD, DM (Cardiology), FACC",
        experience: 24,
        consultationFee: 800,
        rating: 4.9,
        reviewsCount: 420,
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          slots: ["09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "03:00 PM", "03:30 PM"]
        },
        currentQueue: 3,
        nextAvailableToken: 7,
        estimatedWaitPerPatient: 8
      }
    ]
  },
  {
    id: "hosp-care-vizag",
    name: "Care Hospitals",
    category: "Orthopedic",
    rating: 4.5,
    reviewsCount: 620,
    distance: 3.4,
    baseWaitingTime: 25,
    address: "Ram Nagar, Visakhapatnam",
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"
    ],
    about: "Care Hospitals, Visakhapatnam, is a premier healthcare center specializing in comprehensive orthopedic care, joint replacement surgeries, trauma management, and pediatric diagnostics.",
    facilities: ["Orthopedic ICU", "Physiotherapy Center", "24/7 Emergency Care", "Ambulance"],
    departments: [
      DEPARTMENTS[2],
      DEPARTMENTS[5]
    ],
    timings: "Open 24 Hours (OPD: 10:00 AM - 05:00 PM)",
    contact: "+91 891 304 1234",
    lat: 17.7230,
    lng: 83.3012,
    doctors: [
      {
        id: "doc-patnaik-ortho",
        name: "Dr. Prasad Patnaik",
        specialty: "Joint Replacement Surgeon",
        departmentId: "dept-ortho",
        qualification: "MBBS, MS (Orthopedics), MCh (Ortho)",
        experience: 16,
        consultationFee: 700,
        rating: 4.8,
        reviewsCount: 155,
        image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Thu", "Fri"],
          slots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM"]
        },
        currentQueue: 4,
        nextAvailableToken: 8,
        estimatedWaitPerPatient: 15
      }
    ]
  }
];

export const HEALTH_ARTICLES: HealthArticle[] = [
  {
    id: "art-1",
    title: "Understanding OPD Digital Tokens: A Smart Guide to Skipping Queues",
    category: "Health Tech",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80",
    content: "OPD queues can be exhausting, especially when you are unwell. Digital booking systems let you secure a queue spot online, giving you real-time updates and letting you arrive right when the doctor is ready to see you.",
    date: "July 12, 2026"
  },
  {
    id: "art-2",
    title: "5 Simple Ways to Maintain Cardiovascular Health Daily",
    category: "Cardiology",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&auto=format&fit=crop&q=80",
    content: "Your heart works non-stop. Keeping it healthy doesn't require a complete lifestyle overhaul. Focus on 30 minutes of walking daily, reducing sodium, sleeping 7-8 hours, managing stress, and eating fiber-rich foods.",
    date: "July 10, 2026"
  },
  {
    id: "art-3",
    title: "Caring for Children's Teeth: Dental Hygiene Tips for Parents",
    category: "Pediatric Dental",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80",
    content: "Good dental habits start early. Make brushing fun for children using soft-bristled, colorful brushes. Monitor sugar intake and schedule their first dentist visit by their first birthday to screen for early cavities.",
    date: "July 08, 2026"
  }
];

export const MOCK_CUSTOMERS: CustomerAccount[] = [
  {
    id: "cust-1",
    name: "Guest Patient",
    email: "patient@example.com",
    phone: "+91 9876543210",
    location: "Koramangala, Bengaluru",
    joinedDate: "15 Jan 2026",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bookings: [
      {
        id: "tok-1001",
        tokenNumber: 4,
        hospitalId: "hosp-apollo",
        hospitalName: "Apollo Spectra Hospital",
        doctorId: "doc-arvind",
        doctorName: "Dr. Arvind Sharma",
        departmentName: "Cardiology",
        date: "2026-08-14",
        time: "10:30 AM",
        fee: 800,
        status: "completed",
        paymentId: "PAYID-7849204",
        paymentMethod: "UPI"
      },
      {
        id: "tok-1008",
        tokenNumber: 12,
        hospitalId: "hosp-rainbow",
        hospitalName: "Rainbow Children's Hospital",
        doctorId: "doc-carter",
        doctorName: "Dr. John Carter",
        departmentName: "Pediatrics",
        date: "2026-08-10",
        time: "11:15 AM",
        fee: 600,
        status: "completed",
        paymentId: "PAYID-6639102",
        paymentMethod: "Card"
      },
      {
        id: "tok-1015",
        tokenNumber: 15,
        hospitalId: "hosp-nethra",
        hospitalName: "Narayana Nethralaya",
        doctorId: "doc-shalini",
        doctorName: "Dr. Shalini Sen",
        departmentName: "Ophthalmology",
        date: "2026-08-02",
        time: "09:30 AM",
        fee: 650,
        status: "completed",
        paymentId: "PAYID-5510293",
        paymentMethod: "UPI"
      }
    ]
  },
  {
    id: "cust-2",
    name: "Ananya Sharma",
    email: "ananya.s@gmail.com",
    phone: "+91 9820011223",
    location: "HSR Layout, Bengaluru",
    joinedDate: "02 Feb 2026",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bookings: [
      {
        id: "tok-1020",
        tokenNumber: 6,
        hospitalId: "hosp-apollo",
        hospitalName: "Apollo Spectra Hospital",
        doctorId: "doc-sarah",
        doctorName: "Dr. Sarah Jenkins",
        departmentName: "Neurology",
        date: "2026-08-12",
        time: "11:00 AM",
        fee: 1000,
        status: "completed",
        paymentId: "PAYID-9920182",
        paymentMethod: "UPI"
      },
      {
        id: "tok-1024",
        tokenNumber: 3,
        hospitalId: "hosp-fortis",
        hospitalName: "Fortis Hospital",
        doctorId: "doc-meera-gyn",
        doctorName: "Dr. Meera Nair",
        departmentName: "Gynecology",
        date: "2026-08-05",
        time: "10:30 AM",
        fee: 700,
        status: "completed",
        paymentId: "PAYID-8849102",
        paymentMethod: "Card"
      }
    ]
  },
  {
    id: "cust-3",
    name: "Vikram Malhotra",
    email: "vikram.m@yahoo.com",
    phone: "+91 9711223344",
    location: "Gachibowli, Hyderabad",
    joinedDate: "18 Mar 2026",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bookings: [
      {
        id: "tok-1031",
        tokenNumber: 2,
        hospitalId: "hosp-continental",
        hospitalName: "Continental Hospitals",
        doctorId: "doc-raghava-neuro",
        doctorName: "Dr. Raghava Rao",
        departmentName: "Neurology",
        date: "2026-08-14",
        time: "10:00 AM",
        fee: 900,
        status: "completed",
        paymentId: "PAYID-1102948",
        paymentMethod: "Net Banking"
      },
      {
        id: "tok-1035",
        tokenNumber: 5,
        hospitalId: "hosp-ramesh",
        hospitalName: "Ramesh Hospitals",
        doctorId: "doc-ramesh-babu",
        doctorName: "Dr. Ramesh Babu",
        departmentName: "Cardiology",
        date: "2026-07-28",
        time: "11:00 AM",
        fee: 800,
        status: "completed",
        paymentId: "PAYID-7729104",
        paymentMethod: "UPI"
      }
    ]
  },
  {
    id: "cust-4",
    name: "Priya Sundaram",
    email: "priya.sun@outlook.com",
    phone: "+91 9445566778",
    location: "ITI Road, Vijayawada",
    joinedDate: "10 Apr 2026",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bookings: [
      {
        id: "tok-1042",
        tokenNumber: 8,
        hospitalId: "hosp-ramesh",
        hospitalName: "Ramesh Hospitals",
        doctorId: "doc-ramesh-babu",
        doctorName: "Dr. Ramesh Babu",
        departmentName: "Cardiology",
        date: "2026-08-11",
        time: "03:30 PM",
        fee: 800,
        status: "completed",
        paymentId: "PAYID-4402918",
        paymentMethod: "UPI"
      }
    ]
  },
  {
    id: "cust-5",
    name: "Suresh K. Varma",
    email: "suresh.v@gmail.com",
    phone: "+91 9988776655",
    location: "Ram Nagar, Visakhapatnam",
    joinedDate: "25 May 2026",
    status: "active",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bookings: [
      {
        id: "tok-1050",
        tokenNumber: 4,
        hospitalId: "hosp-care-vizag",
        hospitalName: "Care Hospitals",
        doctorId: "doc-patnaik-ortho",
        doctorName: "Dr. Prasad Patnaik",
        departmentName: "Orthopedic",
        date: "2026-08-13",
        time: "10:30 AM",
        fee: 700,
        status: "completed",
        paymentId: "PAYID-3310928",
        paymentMethod: "Card"
      },
      {
        id: "tok-1054",
        tokenNumber: 9,
        hospitalId: "hosp-apollo",
        hospitalName: "Apollo Spectra Hospital",
        doctorId: "doc-ramesh",
        doctorName: "Dr. Ramesh Patel",
        departmentName: "Orthopedic",
        date: "2026-07-20",
        time: "11:30 AM",
        fee: 900,
        status: "completed",
        paymentId: "PAYID-2201948",
        paymentMethod: "UPI"
      }
    ]
  }
];
