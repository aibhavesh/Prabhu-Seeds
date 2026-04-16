/**
 * Travel claim PDF generator.
 * Replicates the Excel template layout including the company logo.
 *
 * Pending journeys are stored in localStorage under PENDING_KEY.
 * printTravelPDF() generates the PDF, downloads it, then clears the list.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, isValid } from 'date-fns'

const PENDING_KEY    = 'travel_pending_journeys'
const LOGO_URL       = '/templates/travel-logo.png'
export const RATE_PER_KM = 3.25

// ── Pending journey storage ────────────────────────────────────────────────────

export function getPendingJourneys() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list.filter(
      (j) =>
        typeof j.startTime === 'number' &&
        typeof j.endTime   === 'number' &&
        typeof j.totalKm   === 'number' &&
        isValid(new Date(j.startTime)) &&
        isValid(new Date(j.endTime)),
    )
  } catch {
    return []
  }
}

export function addPendingJourney(journey) {
  try {
    const list = getPendingJourneys()
    list.push(journey)
    localStorage.setItem(PENDING_KEY, JSON.stringify(list))
  } catch {
    throw new Error('Could not save journey locally. Storage may be full.')
  }
}

export function clearPendingJourneys() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
}

// ── Image → base64 ─────────────────────────────────────────────────────────────

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror  = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── PDF generation ─────────────────────────────────────────────────────────────

export async function printTravelPDF(staffName) {
  const journeys = getPendingJourneys()
  if (journeys.length === 0) throw new Error('No journeys queued for printing yet.')

  const logoBase64 = await fetchImageBase64(LOGO_URL)

  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()   // 297
  const margin = 10

  // ── Logo (top-left, columns A–B in Excel, rows 2–4) ─────────────────────────
  let headerEndY = margin
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, margin, 47, 21)
    headerEndY = margin + 21
  }

  // ── Company name & title (centred) ──────────────────────────────────────────
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PRABHUGOPAL AGRI PRODUCT PVT LTD', pageW / 2, margin + 7, { align: 'center' })

  doc.setFontSize(10)
  doc.text('CLAIM FOR TRAVELLING EXPENSES', pageW / 2, margin + 14, { align: 'center' })

  // ── Name / Date line ─────────────────────────────────────────────────────────
  const infoY = Math.max(headerEndY, margin + 21) + 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${staffName ?? ''}`, margin, infoY)
  doc.text(`Designation:`, margin + 80, infoY)
  doc.text(`Head Quarter:`, margin + 160, infoY)
  doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageW - margin, infoY, { align: 'right' })

  // ── Main table ───────────────────────────────────────────────────────────────
  const tableStartY = infoY + 5

  const head = [
    [
      { content: 'DEPARTURE', colSpan: 3, styles: { halign: 'center', fillColor: [230, 230, 230] } },
      { content: 'ARRIVAL',   colSpan: 3, styles: { halign: 'center', fillColor: [230, 230, 230] } },
      { content: 'Place\nof Stay', rowSpan: 2, styles: { halign: 'center', fillColor: [230, 230, 230], valign: 'middle' } },
      { content: 'DETAILS OF TRAVEL', colSpan: 3, styles: { halign: 'center', fillColor: [230, 230, 230] } },
      { content: 'Rs.', rowSpan: 2, styles: { halign: 'center', fillColor: [230, 230, 230], valign: 'middle' } },
    ],
    [
      'Date', 'Time', 'Place',
      'Date', 'Time', 'Place',
      // Place of Stay is rowSpan above
      'Opp.', 'Closing', 'Km',
      // Rs. is rowSpan above
    ],
  ]

  let totalKm  = 0
  let totalAmt = 0

  const body = journeys.map((j) => {
    const startDate = new Date(j.startTime)
    const endDate   = new Date(j.endTime)
    const km        = parseFloat(Math.max(0, j.totalKm).toFixed(1))
    const amt       = parseFloat((km * RATE_PER_KM).toFixed(2))
    totalKm  += km
    totalAmt += amt

    return [
      isValid(startDate) ? format(startDate, 'dd/MM/yy') : '',
      isValid(startDate) ? format(startDate, 'HH:mm') : '',
      '', // Place — user fills manually
      isValid(endDate) ? format(endDate, 'dd/MM/yy') : '',
      isValid(endDate) ? format(endDate, 'HH:mm') : '',
      '', // Place — user fills manually
      '', // Place of stay — user fills manually
      '0',
      km.toFixed(1),
      km.toFixed(1),
      `₹${amt.toFixed(2)}`,
    ]
  })

  // Total Claim row
  body.push([
    { content: 'Total Claim', colSpan: 8, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
    { content: totalKm.toFixed(1), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 245, 245] } },
    '', // Rs column (formula-based in Excel, shown as total here)
    { content: `₹${totalAmt.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
  ])

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { textColor: 0, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0:  { cellWidth: 20 }, // dep date
      1:  { cellWidth: 13 }, // dep time
      2:  { cellWidth: 30 }, // dep place (blank)
      3:  { cellWidth: 20 }, // arr date
      4:  { cellWidth: 13 }, // arr time
      5:  { cellWidth: 30 }, // arr place (blank)
      6:  { cellWidth: 30 }, // place of stay (blank)
      7:  { cellWidth: 13 }, // opp
      8:  { cellWidth: 18 }, // closing
      9:  { cellWidth: 14 }, // km
      10: { cellWidth: 22 }, // rs
    },
  })

  const afterTable = doc.lastAutoTable?.finalY ?? tableStartY + 10

  // ── Certification line ───────────────────────────────────────────────────────
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(60)
  doc.text(
    'I Certify that the claim is as per the T.A. Rules and I have not stayed with a friend or relative.',
    margin,
    afterTable + 5,
  )
  doc.setTextColor(0)

  // ── Signature section ────────────────────────────────────────────────────────
  const sigY = afterTable + 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Touring person
  doc.line(margin, sigY, margin + 55, sigY)
  doc.text('TOURING PERSON', margin, sigY + 4)

  // Head of department
  doc.line(margin + 70, sigY, margin + 135, sigY)
  doc.text('HEAD OF DEPARTMENT', margin + 70, sigY + 4)

  // Accounts
  doc.line(margin + 155, sigY, pageW - margin, sigY)
  doc.text('ACCOUNTS DEPTT.', margin + 155, sigY + 4)

  // ── Note about blank fields ──────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120)
  doc.text(
    'Note: "Place" columns (Departure, Arrival, Place of Stay) are to be filled manually before submission.',
    margin,
    sigY + 10,
  )
  doc.setTextColor(0)

  // ── Download ──────────────────────────────────────────────────────────────────
  const first = new Date(journeys[0].startTime)
  const last  = new Date(journeys[journeys.length - 1].startTime)
  const name  = (staffName ?? 'staff').replace(/\s+/g, '-')
  const from  = isValid(first) ? format(first, 'yyyy-MM-dd') : 'unknown'
  const to    = isValid(last)  ? format(last,  'yyyy-MM-dd') : 'unknown'

  clearPendingJourneys()
  doc.save(`travel-claim_${name}_${from}_to_${to}.pdf`)
}
