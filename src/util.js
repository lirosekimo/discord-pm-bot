// src/util.js

// 強化版 duration：支援 "10m"、"2h"、"1d"、"30s"、"1h 30m"、"90m"、"15min"、"2hr"…（你目前可用的這版保留）
function parseDuration(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  const regex =
    /(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)/g;
  let total = 0,
    m,
    found = false;
  while ((m = regex.exec(s)) !== null) {
    found = true;
    const n = Number(m[1]);
    const u = m[2];
    if (["s", "sec", "secs", "second", "seconds"].includes(u))
      total += n * 1000;
    else if (["m", "min", "mins", "minute", "minutes"].includes(u))
      total += n * 60_000;
    else if (["h", "hr", "hrs", "hour", "hours"].includes(u))
      total += n * 3_600_000;
    else if (["d", "day", "days"].includes(u)) total += n * 86_400_000;
  }
  if (!found && /^\d+$/.test(s)) {
    total = Number(s) * 60_000;
    found = true;
  } // 純數字＝分鐘
  return !found || total <= 0 ? null : total;
}

// 嚴格手動解析：只接受 ASCII 的兩種寫法（+ 允許 '/'、允許中間用 'T'）
// 例：2025-10-31、2025-10-31 18:00、2025/10/31、2025/10/31T18:00
function parseDateTime(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;

  // 允許用 'T' 當日期與時間的分隔
  s = s.replace("T", " ");

  // 切出日期與（可選的）時間
  const [datePart, timePartRaw] = s.split(" ");
  if (!datePart) return null;

  // 日期可用 '-' 或 '/'；月份與日期允許 1 或 2 位數
  const dateSep = datePart.includes("-")
    ? "-"
    : datePart.includes("/")
    ? "/"
    : null;
  if (!dateSep) return null;

  const [yStr, mStr, dStr] = datePart.split(dateSep);
  if (!/^\d{4}$/.test(yStr)) return null;
  if (!/^\d{1,2}$/.test(mStr)) return null;
  if (!/^\d{1,2}$/.test(dStr)) return null;

  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // 預設時間 00:00
  let hour = 0,
    minute = 0;

  // 有時間部分就解析 HH:mm（允許 1~2 位數）
  if (timePartRaw != null && timePartRaw !== "") {
    const timePart = timePartRaw.trim();
    const t = timePart.split(":");
    if (t.length !== 2) return null;
    const [hStr, minStr] = t;
    if (!/^\d{1,2}$/.test(hStr)) return null;
    if (!/^\d{1,2}$/.test(minStr)) return null;
    hour = Number(hStr);
    minute = Number(minStr);
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;
  }

  // 用「本地時間」建立，避免被當作 UTC
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);

  // 防止溢位（例如 2025-02-31 會跳到 3/3）
  if (
    d.getFullYear() !== year ||
    d.getMonth() + 1 !== month ||
    d.getDate() !== day
  )
    return null;

  return d;
}

function fmtDate(d) {
  return d.toLocaleString("zh-TW", { hour12: false });
}

module.exports = { parseDuration, parseDateTime, fmtDate };
