/**
 * iCalendar (.ics) export — generates valid VCALENDAR text from job phases.
 * Follows RFC 5545. No external dependencies.
 */

export interface ICalPhase { id: string; phaseName: string; startDate: string; endDate: string; status: string; crewAssigned: string[]; notes?: string; projectAddress?: string; estimateNumber?: string; }
export interface ICalOptions { calendarName?: string; companyName?: string; alarmMinutesBefore?: number; }

function toICalDate(iso: string): string { return iso.replace(/-/g, '').slice(0, 8); }
function toExclusiveEndDate(iso: string): string { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); }
function escapeText(s: string): string { return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function foldLine(line: string): string { if (line.length <= 75) return line; const chunks: string[] = []; chunks.push(line.slice(0, 75)); let pos = 75; while (pos < line.length) { chunks.push(' ' + line.slice(pos, pos + 74)); pos += 74; } return chunks.join('\r\n'); }
function nowStamp(): string { return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }
function buildUID(phaseId: string): string { return `${phaseId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}@proestimate.cloud`; }

export function generateVEvent(phase: ICalPhase, options?: ICalOptions): string {
  const alarmMinutes = options?.alarmMinutesBefore ?? 60;
  const stamp = nowStamp();
  const uid = buildUID(phase.id);
  const dtstart = toICalDate(phase.startDate);
  const dtend = toExclusiveEndDate(phase.endDate);
  const summary = phase.estimateNumber ? `${phase.phaseName} - ${phase.estimateNumber}` : phase.phaseName;
  const descParts: string[] = [];
  if (phase.notes) descParts.push(phase.notes);
  if (phase.crewAssigned.length > 0) descParts.push(`Crew: ${phase.crewAssigned.join(', ')}`);
  descParts.push(`Status: ${phase.status}`);
  const description = descParts.join('\\n');
  const lines: string[] = ['BEGIN:VEVENT', foldLine(`UID:${uid}`), foldLine(`DTSTAMP:${stamp}`), foldLine(`DTSTART;VALUE=DATE:${dtstart}`), foldLine(`DTEND;VALUE=DATE:${dtend}`), foldLine(`SUMMARY:${escapeText(summary)}`), foldLine(`DESCRIPTION:${escapeText(description)}`)];
  if (phase.projectAddress) lines.push(foldLine(`LOCATION:${escapeText(phase.projectAddress)}`));
  lines.push('BEGIN:VALARM', `TRIGGER:-PT${alarmMinutes}M`, 'ACTION:DISPLAY', foldLine(`DESCRIPTION:Reminder: ${escapeText(phase.phaseName)} starts soon`), 'END:VALARM', 'END:VEVENT');
  return lines.join('\r\n');
}

export function generateICalendar(phases: ICalPhase[], options?: ICalOptions): string {
  const calendarName = options?.calendarName ?? 'ProEstimate Schedule';
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ProEstimate//Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', foldLine(`X-WR-CALNAME:${escapeText(calendarName)}`)];
  for (const phase of phases) { if (!phase.startDate || !phase.endDate) continue; lines.push(generateVEvent(phase, options)); }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
