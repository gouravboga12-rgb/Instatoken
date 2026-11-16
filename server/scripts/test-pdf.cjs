const { jsPDF } = require('jspdf');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// A4: 210mm wide x 297mm high
// Margins: 15mm left/right -> 180mm printable width

// 1. Top Header Banner (Blue)
doc.setFillColor(30, 64, 175); // #1E40AF
doc.roundedRect(15, 15, 180, 24, 3, 3, 'F');

doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.text('INSTATOKEN · OFFICIAL OPD APPOINTMENT PASS', 20, 22);

doc.setFontSize(14);
doc.text('Gandhi Hospital', 20, 30);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(219, 234, 254);
doc.text('Musheerabad, Bhoiguda, Secunderabad · Ph: +91 80 4668 8888', 20, 35);

// 2. Token Number & Time Card (Light Blue gradient)
doc.setFillColor(239, 246, 255); // #EFF6FF
doc.setDrawColor(191, 219, 254); // #BFDBFE
doc.roundedRect(15, 43, 180, 36, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(37, 99, 235); // #2563EB
doc.text('YOUR TOKEN NUMBER', 22, 51);

doc.setFontSize(28);
doc.setTextColor(29, 78, 216); // #1D4ED8
doc.text('#1', 22, 63);

doc.setFontSize(9);
doc.setTextColor(71, 85, 105);
doc.text('Slot Time: 10:00 AM · Morning OPD', 22, 70);
doc.text('Date: 16 Nov 2026 (Monday)', 22, 75);

// Status Badge inside Token Card
doc.setFillColor(16, 185, 129); // #10B981
doc.roundedRect(140, 48, 45, 8, 2, 2, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(7.5);
doc.setFont('helvetica', 'bold');
doc.text('TOKEN CONFIRMED', 145, 53.5);

// 3. Grid: Patient Details & Doctor Details
// Left box: Patient
doc.setFillColor(248, 250, 252);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(15, 83, 87, 44, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(30, 64, 175);
doc.text('PATIENT DETAILS', 20, 90);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(15, 23, 42);
doc.text('Gourav', 20, 97);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(71, 85, 105);
doc.text('Age / Gender: 28 Yrs (Male)', 20, 103);
doc.text('Contact: +91 7337401590', 20, 109);
doc.text('Booking ID: tok-9467', 20, 115);
doc.text('Queue Status: On Schedule', 20, 121);

// Right box: Doctor
doc.setFillColor(248, 250, 252);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(108, 83, 87, 44, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(30, 64, 175);
doc.text('CONSULTING DOCTOR', 113, 90);

doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(15, 23, 42);
doc.text('Dr. V. Ramesh', 113, 97);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(71, 85, 105);
doc.text('Department: General Medicine', 113, 103);
doc.text('OPD Room: Cabin #102', 113, 109);
doc.text('Est. Wait: ~15 mins', 113, 115);
doc.text('Consultation Validity: 7 Days', 113, 121);

// 4. Payment & Fees Summary Box
doc.setFillColor(241, 245, 249);
doc.setDrawColor(203, 213, 225);
doc.roundedRect(15, 131, 180, 36, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(51, 65, 85);
doc.text('PAYMENT & CHARGES BREAKDOWN', 20, 138);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(71, 85, 105);
doc.text('Doctor Consultation Fee:', 20, 145);
doc.setFont('helvetica', 'bold');
doc.setTextColor(15, 23, 42);
doc.text('Rs. 250.00 (Paid in Advance Online)', 85, 145);

doc.setFont('helvetica', 'normal');
doc.setTextColor(71, 85, 105);
doc.text('Platform & Gateway Charges:', 20, 151);
doc.setFont('helvetica', 'bold');
doc.setTextColor(15, 23, 42);
doc.text('Rs. 17.11 (Paid Online via Razorpay)', 85, 151);

doc.setFont('helvetica', 'normal');
doc.setTextColor(71, 85, 105);
doc.text('Total Amount Paid:', 20, 157);
doc.setFont('helvetica', 'bold');
doc.setTextColor(22, 101, 52); // green
doc.text('Rs. 267.11 (FULL ONLINE PAYMENT VERIFIED)', 85, 157);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(100, 116, 139);
doc.text('Transaction Ref: PAY-tok-9467 · Razorpay Gateway Verified', 20, 163);

// 5. Important Instructions Box
doc.setFillColor(254, 252, 232); // #FEFCE8
doc.setDrawColor(254, 240, 138);
doc.roundedRect(15, 171, 180, 34, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(133, 77, 14);
doc.text('IMPORTANT PATIENT INSTRUCTIONS', 20, 178);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(113, 63, 18);
doc.text('1. Please reach the hospital 10-15 minutes prior to your allocated slot time.', 20, 184);
doc.text('2. Present this token pass at the hospital OPD reception / kiosk upon arrival.', 20, 189);
doc.text('3. Doctor consultation fee has been paid online in full (No extra fee at cabin).', 20, 194);
doc.text('4. This token slip is valid for 7 Days (up to 2 Follow-up visits) from booking date.', 20, 199);

// 6. Security Footer
doc.setDrawColor(226, 232, 240);
doc.line(15, 215, 195, 215);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(148, 163, 184);
doc.text('Generated by InstaToken OPD Platform · 100% Guaranteed Appointment Slot', 15, 221);
doc.text('Visit: www.instatoken.in · Need Help? Call Hospital OPD Desk', 15, 226);

const out = doc.output('arraybuffer');
console.log('PDF generated successfully, size:', out.byteLength, 'bytes');
