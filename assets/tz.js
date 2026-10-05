// The UTC offset a time zone had at a local wall time, from the browser's
// own time zone data through Intl.DateTimeFormat, historical rules included
// (docs/10, phase 3). The same question the app asks its timezone package
// in BirthOffset.offsetMinutes; app/tool/tz_offsets.dart prints the app's
// answers and site/build/tz_check.mjs compares them with this.
//
// Two passes: guess the instant as if the wall time were UTC, read the
// zone's offset there, step back by it, and read again, which settles the
// hour around a transition. An unknown zone gives null.
export function utcOffsetMinutes(zone, year, month, day, hour, minute) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric",
      day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    });
  } catch (e) {
    return null;
  }
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (t) => {
    const p = {};
    for (const part of fmt.formatToParts(new Date(t))) p[part.type] = part.value;
    const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((seen - t) / 60000);
  };
  let offset = offsetAt(wall);
  const again = offsetAt(wall - offset * 60000);
  if (again !== offset) offset = again;
  return offset;
}

/** "UTC+03:00", as the app writes it (BirthOffset.format). */
export function formatOffset(minutes) {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
