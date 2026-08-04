import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"
import type { AttendanceSession } from "@/lib/attendance-history"
import { formatDisplayDate } from "@/lib/attendance-history"
import { deliverFile, type DeliveryResult } from "@/lib/share-export"

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

/** Full attendance log (every finalized session, every student) as CSV. */
export function buildHistoryCsv(sessions: AttendanceSession[]) {
  const header = ["Date", "Time", "Roll", "Name", "Email", "Status"].join(",")
  const rows: string[] = []
  for (const s of sessions) {
    for (const r of s.records) {
      rows.push(
        [
          s.date,
          csvCell(s.time),
          r.rollNo,
          csvCell(r.name || "—"),
          csvCell(r.email || ""),
          r.status,
        ].join(","),
      )
    }
  }
  const summary = [
    "",
    "Date,Time,Present,Late,Absent,Total,Percentage",
    ...sessions.map((s) =>
      [s.date, csvCell(s.time), s.presentCount, s.lateCount, s.absentCount, s.totalStudents, `${s.percentage}%`].join(
        ",",
      ),
    ),
  ]
  return [header, ...rows, ...summary].join("\n")
}

export function buildHistoryCsvBlob(sessions: AttendanceSession[]) {
  // BOM keeps Excel happy with UTF-8 names.
  return new Blob(["\uFEFF" + buildHistoryCsv(sessions)], { type: "text/csv;charset=utf-8" })
}

export function exportHistoryCsv(sessions: AttendanceSession[]): Promise<DeliveryResult> {
  return deliverFile(buildHistoryCsvBlob(sessions), `campusroll-attendance-${stamp()}.csv`, {
    title: "CampusRoll attendance (CSV)",
  })
}

/** Excel workbook with a records sheet and a per-session summary sheet. */
export function buildHistoryXlsxBlob(sessions: AttendanceSession[]) {
  const records = sessions.flatMap((s) =>
    s.records.map((r) => ({
      Date: s.date,
      Time: s.time,
      Roll: r.rollNo,
      Name: r.name || "—",
      Email: r.email || "",
      Status: r.status,
    })),
  )
  const summary = sessions.map((s) => ({
    Date: s.date,
    Time: s.time,
    Present: s.presentCount,
    Late: s.lateCount,
    Absent: s.absentCount,
    Total: s.totalStudents,
    Percentage: `${s.percentage}%`,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(records.length ? records : [{ Date: "", Time: "", Roll: "", Name: "", Email: "", Status: "" }]),
    "Records",
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summary.length ? summary : [{ Date: "", Time: "", Present: 0, Late: 0, Absent: 0, Total: 0, Percentage: "0%" }]),
    "Summary",
  )

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export function exportHistoryXlsx(sessions: AttendanceSession[]): Promise<DeliveryResult> {
  return deliverFile(buildHistoryXlsxBlob(sessions), `campusroll-attendance-${stamp()}.xlsx`, {
    title: "CampusRoll attendance (Excel)",
  })
}

/** Same log rendered as a paginated PDF report. */
export function buildHistoryPdfBlob(sessions: AttendanceSession[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40
  let y = 56

  const newPageIfNeeded = (needed = 18) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage()
      y = 56
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("CampusRoll — Attendance Report", marginX, y)
  y += 20
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text("YMCA BCA Data Science — Section A", marginX, y)
  y += 14
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y)
  y += 24
  doc.setTextColor(0)

  if (sessions.length === 0) {
    doc.setFontSize(12)
    doc.text("No finalized sessions recorded yet.", marginX, y)
  }

  for (const s of sessions) {
    newPageIfNeeded(70)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`${formatDisplayDate(s.date)} · ${s.time}`, marginX, y)
    y += 15
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(110)
    doc.text(
      `Present ${s.presentCount} · Late ${s.lateCount} · Absent ${s.absentCount} · Total ${s.totalStudents} · ${s.percentage}%`,
      marginX,
      y,
    )
    y += 16
    doc.setTextColor(0)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("Roll", marginX, y)
    doc.text("Name", marginX + 50, y)
    doc.text("Email", marginX + 220, y)
    doc.text("Status", marginX + 420, y)
    y += 6
    doc.setDrawColor(200)
    doc.line(marginX, y, 555, y)
    y += 12
    doc.setFont("helvetica", "normal")

    for (const r of s.records) {
      newPageIfNeeded()
      doc.text(r.rollNo, marginX, y)
      doc.text((r.name || "—").slice(0, 34), marginX + 50, y)
      doc.text((r.email || "—").slice(0, 40), marginX + 220, y)
      doc.text(r.status, marginX + 420, y)
      y += 13
    }
    y += 14
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`Developed by Pankaj Singh · Page ${i} of ${pages}`, marginX, pageHeight - 28)
  }

  return doc.output("blob")
}

export function exportHistoryPdf(sessions: AttendanceSession[]): Promise<DeliveryResult> {
  return deliverFile(buildHistoryPdfBlob(sessions), `campusroll-attendance-${stamp()}.pdf`, {
    title: "CampusRoll attendance (PDF)",
  })
}

/* ---------- Single session ---------- */

export function exportSessionPdf(session: AttendanceSession): Promise<DeliveryResult> {
  return deliverFile(buildHistoryPdfBlob([session]), `attendance-${session.date}.pdf`, {
    title: `CampusRoll attendance ${session.date} (PDF)`,
  })
}

export function exportSessionXlsx(session: AttendanceSession): Promise<DeliveryResult> {
  return deliverFile(buildHistoryXlsxBlob([session]), `attendance-${session.date}.xlsx`, {
    title: `CampusRoll attendance ${session.date} (Excel)`,
  })
}
