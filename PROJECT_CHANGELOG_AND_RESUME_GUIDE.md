# InstaToken - Project Changelog & Resume Guide

> **Document Created:** October 22, 2026  
> **Repository:** `d:\Company Projects\Insta Token`  
> **Status:** Production Build Passing (`tsc -b && vite build` - 0 errors)  
> **Purpose:** Detailed summary of all architectural and feature updates completed till now to enable seamless continuation at any time.

---

## 1. Project Overview & Architecture

InstaToken is a full-stack digital OPD token management and queue optimization platform for hospitals and clinics. It features three interconnected portals:
1. **User / Patient Portal:** For browsing hospitals, discovering specialist doctors, and booking digital OPD tokens online.
2. **Hospital Administration & Doctor Cabin Portal:** For reception desk walk-in registrations, live cabin queues, TV token displays, referring doctor management, and doctor revenue ledgers.
3. **Super Admin Dashboard:** For platform-wide hospital onboarding, revenue oversight, and system monitoring.

### Tech Stack:
* **Frontend:** React 19, Vite 8, Tailwind CSS, Lucide Icons, React Router DOM 6.
* **Backend:** Node.js, Express, PostgreSQL (AWS RDS), Unified JSON in-memory store.
* **Real-time Sync:** `BroadcastChannel` (`syncBus.ts`) for cross-tab multi-screen synchronization.

---

## 2. Comprehensive Changelog of Recent Updates

### A. Super Admin Panel: City, Village & Area Name Updates
* **Context / Reference:** `image copy 77.png`
* **Changes Implemented:**
  * In both the **Overview Hospitals Table** and **Hospital Roster Table**, replaced raw street address / building strings with clean, standardized **`City, Village & Area`** (e.g. `Hyderabad, Kothapet`, `Adoni, SKD Colony`, `Adoni, Rotary Nagar`).
  * Updated table column headers explicitly to **`City, Village & Area`**.
  * Added `getHospitalLocationDisplay(hosp)` helper in `AdminDashboard.tsx` to format addresses seamlessly.
  * Updated the **Add Hospital Form** to include dedicated inputs for:
    * `City / Town`
    * `Village / Area Name`
    * Street address.
* **Files Modified:**
  * `src/pages/admin/AdminDashboard.tsx`
  * `src/utils/mockData.ts`

---

### B. User-Side Token Booking: Itemized Fee Breakdown with GST
* **Context / Reference:** `image copy 78.png`
* **Changes Implemented:**
  * **Doctor Consultation Fee Card (Green Card):**
    * Highlights the consultation fee (e.g. ₹300) with a `"Pay at Hospital"` badge.
    * Explanatory text that the consultation fee is paid directly at the hospital counter.
  * **InstaToken Booking Charges Card (Blue Card):**
    * Platform Fee (5% of consultation fee): ₹15.00
    * Payment Gateway Fee: ₹1.50
    * 18% GST (on Platform + Gateway fees): ₹2.97
    * **Total Payable Now:** ₹19.47
  * **Action CTA:** Dynamic button displaying `Pay ₹[Total Payable] and Confirm Booking ->`.
  * **Doctor Reference (RMP) Section:**
    * Added **Place / Village** input field alongside Referring Doctor Name and Mobile Number.
  * **Account & Confirmation Persistence:**
    * Propagated full fee breakdown (`platformFee`, `gatewayFee`, `gstFee`, `totalFee`) and Doctor Reference into `TokenConfirmation.tsx` and `MyBookings.tsx`.
* **Files Modified:**
  * `src/pages/patient/BookToken.tsx`
  * `src/pages/patient/Payment.tsx`
  * `src/pages/patient/MyBookings.tsx`
  * `src/pages/patient/TokenConfirmation.tsx`
  * `src/context/AppContext.tsx`

---

### C. Hospital Panel: Dedicated Doctor Reference Management
* **Context / Reference:** `image copy 79.png`
* **Changes Implemented:**
  * **New Dedicated Page:** Created `src/pages/hospital/DoctorReferences.tsx` accessible at `/hospital/doctor-references` and `/hospital/rmp-referrals`.
  * **Navigation:** Added sidebar navigation link with `Stethoscope` icon in `HospitalLayout.tsx`.
  * **KPI Summary Cards:**
    * Total Referring Doctors
    * Total Referred Patients
    * Active Doctors
    * Today's Referred Patients
  * **Date-Wise Filtering:** All Time, Today, Yesterday, Last 7 Days, This Month, and Custom Date Range picker.
  * **Search & Roster Table:** Search referring doctors by name, phone, or village/place with pagination.
  * **Referred Patients Verification Drawer:** Clicking any doctor opens an interactive slide-over details drawer showing the doctor's profile and a full table of all referred patients (Token No, Name, Phone, Place/Village, Date, Consultation Status) for verification by hospital panel members.
  * **"+ Add Doctor Reference" Modal:** Allows hospital staff to register new referring doctors with Name, Mobile, Place/Village, Qualification, Status, and Internal Notes.
  * **Doctor Cabin Queue Badge:** `DoctorTokenScreen.tsx` displays a `Doctor Ref: Dr. ...` badge on all referred tokens.
  * **Standardized Backend Model:** Standardized terminology from `rmpReference` to `doctorReference` (`{ name, phone, place, qualification }`) with backward-compatibility fallback.
* **Files Modified / Created:**
  * `src/pages/hospital/DoctorReferences.tsx` (New)
  * `src/pages/hospital/HospitalLayout.tsx`
  * `src/context/HospitalContext.tsx`
  * `src/pages/hospital/DoctorTokenScreen.tsx`
  * `server/index.js`

---

### D. Walk-in Token Registration: Payment Details Card
* **Context / Reference:** User reference image (`Add Walk-in Token`)
* **Changes Implemented:**
  * Inside `WalkInGenerator` in `TokenManagement.tsx`, added the exact **Payment Details** section right above the existing patient / doctor reference checkboxes:
    * **Payment Status \* (2 Toggle Cards):**
      * `[ ✓ Paid (•) ]`: Emerald tint, check icon, active blue radio dot.
      * `[ ◯ Not Paid ◯ ]`: Gray outline, empty radio circle.
    * **Payment Method \* (2 Toggle Cards):**
      * `[ 💳 Online (UPI / Card / Net Banking) (•) ]`: Card icon, subtext, active blue radio dot.
      * `[ 💵 Cash ◯ ]`: Banknote icon, empty radio circle.
  * When generating a walk-in token, its initial `paymentStatus` (`paid` or `pending`) and `paymentMethod` (`Online`, `Cash`, or `Unpaid / Pending`) are recorded and synced immediately.
* **Files Modified:**
  * `src/pages/hospital/TokenManagement.tsx`
  * `src/context/HospitalContext.tsx`

---

### E. Consultation Fee Payment Collection & Updating Flow
* **Context / User Audio Requirement:**
  * Online tokens arrive with `Pay at Hospital` pending status.
  * Marking a token as **"Visited"** must prompt for the consultation fee payment method (`Cash` vs `Online` vs `Not Paid`).
  * If a token is marked as `Not Paid` / `Unpaid`, staff can easily update it to `Paid` later, or switch payment methods if a mistake was made.
* **Changes Implemented:**
  1. **Reusable `<TokenPaymentModal />` Component:**
     * Created `src/components/hospital/TokenPaymentModal.tsx` matching the 4-option layout (Paid / Not Paid, Online / Cash).
  2. **Online Tokens Completion Prompt:**
     * In `DoctorTokenScreen.tsx`, clicking **"Visited / Done"** on an online token (or any token with pending consultation fee) opens the **"Collect Consultation Fee"** modal.
     * In `TokenManagement.tsx` and `RevenueOverview.tsx`, clicking **"Complete"** / **"Mark Visited"** prompts to record how the fee was collected.
  3. **Updating Unpaid Tokens to Paid Later:**
     * In the **Doctor Cabin Screen** and **Reception Token Queue**, the Fee & Payment column displays an interactive badge:
       * Unpaid tokens show: `⏳ Pending · Collect` (or `⏳ Unpaid`).
       * **Clicking this badge** opens the `Update Consultation Fee Payment` modal.
       * Staff selects `Paid` and `Cash` (or `Online`), clicks **"Save & Update Payment"**, and the badge immediately turns to `✓ Paid · Cash` (or `✓ Paid · Online`).
       * The consultation fee is immediately added to the doctor's **Today's Earned Revenue** card.
     * **Editing Mistakes:** If staff accidentally selected Cash instead of Online, clicking the badge allows them to switch it to Online at any time.
  4. **State & Backend Sync:**
     * Added `updateTokenPayment(tokenId, paymentStatus, paymentMethod)` in `HospitalContext.tsx`.
     * Updated `PATCH /api/hospitals/:hospitalId/tokens/:tokenId/status` in `server/index.js` to persist `paymentStatus` and `paymentMethod` to both AWS RDS PostgreSQL and the unified JSON store.
* **Files Modified / Created:**
  * `src/components/hospital/TokenPaymentModal.tsx` (New)
  * `src/pages/hospital/DoctorTokenScreen.tsx`
  * `src/pages/hospital/TokenManagement.tsx`
  * `src/pages/hospital/RevenueOverview.tsx`
  * `src/context/HospitalContext.tsx`
  * `server/index.js`

---

## 3. Key Files Reference Index

| File Path | Description of Changes |
| :--- | :--- |
| `src/components/hospital/TokenPaymentModal.tsx` | Reusable modal for confirming or updating consultation fee payment status & method. |
| `src/context/HospitalContext.tsx` | Extended `generateWalkInToken`, `updateTokenStatus`, and added `updateTokenPayment` helper and state broadcast. |
| `src/pages/hospital/TokenManagement.tsx` | Added Payment Details card to `WalkInGenerator`, interactive payment badges in queue table, and completion prompt. |
| `src/pages/hospital/DoctorTokenScreen.tsx` | Interactive payment chip in table, automatic fee collection modal on clicking "Visited", and instant revenue update. |
| `src/pages/hospital/DoctorReferences.tsx` | Dedicated page for Doctor / RMP references with KPI cards, date filters, patient details drawer, and registration modal. |
| `src/pages/hospital/RevenueOverview.tsx` | Payment confirmation modal when marking consultations as visited from the doctor history drawer. |
| `src/pages/admin/AdminDashboard.tsx` | `City, Village & Area` display in Overview and Roster tables; updated Add Hospital form with City and Village inputs. |
| `src/pages/patient/BookToken.tsx` | Green Consultation Fee card, blue InstaToken Booking Charges card (Platform 5%, Gateway ₹1.50, GST 18%), Place/Village input. |
| `src/pages/patient/Payment.tsx` | GST itemized payment summary card. |
| `src/pages/patient/TokenConfirmation.tsx` | Confirmation screen with Doctor Reference and fee breakdown. |
| `src/pages/patient/MyBookings.tsx` | User Account booking card displaying Doctor Reference and itemized fee breakdown. |
| `src/pages/common/Login.tsx` | Redesigned for direct 10-digit mobile number + DLT SMS OTP; removed passwords & forgot password modal. |
| `src/pages/hospital/HospitalLogin.tsx` | Redesigned for registered admin mobile number + DLT SMS OTP; removed passwords & forgot password modal. |
| `src/pages/hospital/HospitalSignup.tsx` | Passwordless hospital onboarding with basic details + direct mobile DLT OTP verification. |
| `src/utils/otpService.ts` | Added client-side wrappers for DLT SMS OTP dispatch, verification, and phone number normalization. |
| `src/context/AppContext.tsx` | Added `loginWithPhoneOtp` authentication handler and session management. |
| `src/context/HospitalContext.tsx` | Added `hospitalLoginWithOtp` and `hospitalSignupWithOtp` session handlers. |
| `server/services/smsService.js` | Created backend MSG91 Flow API engine with TRAI DLT parameters (`ITOKEN`, Entity ID `1001055982584059273`, Template `1077385660092541347`), rate limiting, 10m expiry, and test bypass (`123456`). |
| `server/index.js` | Added `/api/auth/sms/send-otp`, `/api/customers/otp-auth`, `/api/auth/hospital-otp-login`, and `/api/auth/hospital-otp-signup` with full RDS relational multi-table synchronization (`hospitals`, `hospital_profiles`, `hospital_departments`). |
| `server/.env` | Added MSG91 Flow API and DLT telecom parameters. |
| `server/index.js` | Updated `/api/appointments` POST and `/api/hospitals/:hospitalId/tokens/:tokenId/status` PATCH endpoints for payment & doctor reference. |

---

## 4. How to Run and Verify the Project

### Development Server:
```bash
# Terminal 1: Frontend (Vite)
npm run dev
# Running on http://localhost:5173/

# Terminal 2: Backend API (Express + Postgres)
node server/index.js
# Running on http://localhost:3001/
```

### Production Build Verification:
```bash
npm run build
# Runs: tsc -b && vite build
# Status: Passes with 0 errors
```

### Key Routes to Verify:
* **Super Admin Panel:** `http://localhost:5173/admin`
* **User Token Booking:** `http://localhost:5173/book/hosp-apollo/doc-arvind`
* **User Account Bookings:** `http://localhost:5173/my-bookings`
* **Hospital Walk-in Registration:** `http://localhost:5173/hospital/tokens`
* **Hospital Doctor Cabin Screen:** `http://localhost:5173/hospital/doctor-screen`
* **Hospital Doctor References Page:** `http://localhost:5173/hospital/doctor-references`
* **Hospital Revenue Overview:** `http://localhost:5173/hospital/revenue`

---

## 5. Next Steps / Future Enhancements
* Ready to proceed with any additional requests, reports, print slip customizations, or SMS/WhatsApp gateway integrations as directed.
