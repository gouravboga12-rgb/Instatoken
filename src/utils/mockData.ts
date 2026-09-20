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
  sessions?: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    maxTokens?: number;
    consultationDuration?: number;
    breakTime?: number;
    active: boolean;
  }>;
  opdDays?: string[];
  active?: boolean;
  onlineConsult?: boolean;
  offlineConsult?: boolean;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
}

export interface Hospital {
  id: string;
  name: string;
  email?: string;
  phone?: string;
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
  emergencyContact?: string;
  whatsapp?: string;
  website?: string;
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
  lat?: number;
  lng?: number;
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
  { id: "dept-cardio", name: "Cardiology", icon: "Heart" },
  { id: "dept-neuro", name: "Neurology", icon: "Brain" },
  { id: "dept-ortho", name: "Orthopedics", icon: "Activity" },
  { id: "dept-pedia", name: "Pediatrics", icon: "Baby" },
  { id: "dept-gynaec", name: "Gynecology", icon: "Users" },
  { id: "dept-general", name: "General Medicine", icon: "Stethoscope" },
  { id: "dept-eye", name: "Ophthalmology", icon: "Eye" },
  { id: "dept-dental", name: "Dental", icon: "Smile" }
];

export const HOSPITALS: Hospital[] = [
  {
    id: "hosp-apollo",
    name: "City Care Multi-Specialty Hospital",
    category: "Multi Speciality",
    rating: 4.8,
    reviewsCount: 1240,
    distance: 1.8,
    baseWaitingTime: 20,
    address: "15-57/2, RAMkrishna Raju Residency, Pratap Nagar, Kothapet, Hyderabad, Telangana 500060, India",
    email: "info@instatoken.in",
    phone: "+91 80 4668 8888",
    image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80"
    ],
    about: "City Care Multi-Specialty Hospital is a state-of-the-art multi-specialty hospital committed to bringing you the best clinical outcomes in a simplified, service-oriented environment. Equipped with advanced diagnostic infrastructure and led by top healthcare specialists.",
    facilities: ["24/7 Emergency", "ICU", "Pharmacy", "Ambulance", "Lab Testing", "Cafeteria"],
    departments: DEPARTMENTS,
    timings: "Open 24 Hours (OPD: 09:00 AM - 05:00 PM)",
    contact: "+91 80 4668 8888",
    lat: 17.37336200634615,
    lng: 78.53855589118986,
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
        estimatedWaitPerPatient: 12,
        sessions: [
          { id: "sess-arvind-1", name: "Morning", startTime: "09:00 AM", endTime: "04:00 PM", active: true },
          { id: "sess-arvind-2", name: "Evening", startTime: "05:00 PM", endTime: "10:00 PM", active: true }
        ]
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
        estimatedWaitPerPatient: 15,
        sessions: [
          { id: "sess-sarah-1", name: "Afternoon", startTime: "01:30 PM", endTime: "05:30 PM", active: true },
          { id: "sess-sarah-2", name: "Evening", startTime: "06:00 PM", endTime: "08:30 PM", active: true }
        ]
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
        estimatedWaitPerPatient: 10,
        sessions: [
          { id: "sess-ramesh-1", name: "Morning", startTime: "09:30 AM", endTime: "01:00 PM", active: true },
          { id: "sess-ramesh-2", name: "Evening", startTime: "05:00 PM", endTime: "08:30 PM", active: true }
        ]
      },
      {
        id: "doc-anjali",
        name: "Dr. Anjali Sharma",
        specialty: "Pediatrician",
        departmentId: "dept-pedia",
        qualification: "MD (Pediatrics), Fellowship in Neonatology",
        experience: 10,
        consultationFee: 700,
        rating: 4.8,
        reviewsCount: 195,
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          slots: ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "02:00 PM"]
        },
        currentQueue: 3,
        nextAvailableToken: 7,
        estimatedWaitPerPatient: 12,
        sessions: [
          { id: "sess-anjali-1", name: "Morning", startTime: "09:00 AM", endTime: "01:00 PM", active: true },
          { id: "sess-anjali-2", name: "Evening", startTime: "04:00 PM", endTime: "08:00 PM", active: true }
        ]
      },
      {
        id: "doc-vivek",
        name: "Dr. Vivek Singh",
        specialty: "Orthopedic Surgeon",
        departmentId: "dept-ortho",
        qualification: "MBBS, MS - Orthopedics",
        experience: 12,
        consultationFee: 600,
        rating: 4.6,
        reviewsCount: 140,
        image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
        availability: {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          slots: ["05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM"]
        },
        currentQueue: 1,
        nextAvailableToken: 4,
        estimatedWaitPerPatient: 15,
        sessions: [
          { id: "sess-vivek-1", name: "Evening", startTime: "05:00 PM", endTime: "09:00 PM", active: true }
        ]
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

export const MOCK_CUSTOMERS: CustomerAccount[] = [];
