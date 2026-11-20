/**
 * Indian Standard Time (IST, UTC+5:30) helper utilities
 * Guarantees consistent real-world time evaluation regardless of client device timezone or UTC server clocks.
 */

export interface ISTTimeInfo {
  dateStr: string;      // YYYY-MM-DD in IST
  time24: string;       // HH:mm in IST (24h)
  totalMinutes: number; // Minutes from midnight (0 - 1439)
}

/**
 * Returns current date and time strictly in Asia/Kolkata (IST).
 */
export function getNowIST(): ISTTimeInfo {
  const now = new Date();
  
  // Format YYYY-MM-DD in IST
  const dateStr = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  // Format HH:mm (24h) in IST
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const timeParts = timeFormatter.formatToParts(now);
  const hour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;
  const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { dateStr, time24, totalMinutes };
}

/**
 * Parses a time string (e.g. "01:00 PM", "13:00", "9:00 PM", or a range like "10:00 AM - 01:00 PM")
 * into minutes from midnight.
 */
export function parseTimeToMinutes(rawStr: string): number {
  if (!rawStr || typeof rawStr !== 'string') return 1440; // Default to end of day if invalid

  // If a range is provided, take the end time
  const parts = rawStr.split(/[-–—]|to/i);
  const target = parts[parts.length - 1].trim();

  // Check 12-hour AM/PM format (e.g. "01:00 PM", "1:30 pm", "11:00 AM")
  const ampmMatch = target.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2] || '0', 10);
    const meridiem = ampmMatch[3].toLowerCase();

    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  // Check 24-hour format (e.g. "13:00", "09:30")
  const militaryMatch = target.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hour = parseInt(militaryMatch[1], 10);
    const minute = parseInt(militaryMatch[2], 10);
    return hour * 60 + minute;
  }

  // Check common session names
  const lower = target.toLowerCase();
  if (lower.includes('morn')) return 13 * 60; // 01:00 PM (780 mins)
  if (lower.includes('after')) return 17 * 60; // 05:00 PM (1020 mins)
  if (lower.includes('even')) return 21 * 60; // 09:00 PM (1260 mins)
  if (lower.includes('night')) return 23 * 60; // 11:00 PM (1380 mins)

  return 1440;
}

/**
 * Checks whether an OPD session has already expired in real-world Indian Standard Time.
 * 
 * @param sessionEndTimeOrRange E.g. "01:00 PM", "10:00 AM - 01:00 PM", or "Morning"
 * @param targetDateStr Target date in YYYY-MM-DD format. Defaults to today's IST date.
 * @returns boolean true if the session's scheduled end time has already elapsed.
 */
export function isSessionExpiredInIST(sessionEndTimeOrRange: string, targetDateStr?: string): boolean {
  const { dateStr: todayIST, totalMinutes: nowMinutesIST } = getNowIST();
  const dateToEvaluate = targetDateStr || todayIST;

  // Past calendar dates are always expired
  if (dateToEvaluate < todayIST) return true;

  // Future calendar dates are never expired
  if (dateToEvaluate > todayIST) return false;

  // For today: compare against session's end time in minutes
  const sessionEndMinutes = parseTimeToMinutes(sessionEndTimeOrRange);
  return nowMinutesIST >= sessionEndMinutes;
}
