/**
 * Travel claim PDF generator.
 *
 * Pending journeys are stored in localStorage under PENDING_KEY.
 * Each journey = { startTime, endTime, totalKm }
 *
 * printTravelPDF() generates an A4 PDF matching the travel claim format,
 * downloads it, then clears the pending list.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, isValid } from 'date-fns'

const PENDING_KEY = 'travel_pending_journeys'
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

// ── PDF generation ─────────────────────────────────────────────────────────────

/**
 * Generates an A4 travel claim PDF from all pending journeys and downloads it.
 * Clears the pending list after the PDF is built.
 *
 * @param {string} staffName
 */
export async function printTravelPDF(staffName) {
  const journeys = getPendingJourneys()
  if (journeys.length === 0) throw new Error('No journeys queued for printing yet.')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PRABHUGOPAL AGRI PRODUCT PVT LTD', pageW / 2, 14, { align: 'center' })

  doc.setFontSize(11)
  doc.text('CLAIM FOR TRAVELLING EXPENSES', pageW / 2, 21, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${staffName ?? ''}`, 14, 30)
  doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, pageW - 14, 30, { align: 'right' })

  // ── Table ────────────────────────────────────────────────────────────────────
  const head = [
    [
      { content: 'DEPARTURE', colSpan: 3, styles: { halign: 'center' } },
      { content: 'ARRIVAL',   colSpan: 3, styles: { halign: 'center' } },
      { content: 'Place of Stay', styles: { halign: 'center' } },
      { content: 'DETAILS OF TRAVEL', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Rs.', styles: { halign: 'center' } },
    ],
    ['Date', 'Time', 'Place', 'Date', 'Time', 'Place', '', 'Opp.', 'Closing', 'Km', 'Rs.'],
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
      isValid(startDate) ? format(startDate, 'dd/MM/yyyy') : '',
      isValid(startDate) ? format(startDate, 'HH:mm') : '',
      '', // place — filled manually
      isValid(endDate) ? format(endDate, 'dd/MM/yyyy') : '',
      isValid(endDate) ? format(endDate, 'HH:mm') : '',
      '', // place — filled manually
      '', // place of stay — filled manually
      '0',
      km.toFixed(1),
      km.toFixed(1),
      `${amt.toFixed(2)}`,
    ]
  })

  // Totals row
  body.push([
    { content: 'TOTAL', colSpan: 9, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: totalKm.toFixed(1), styles: { fontStyle: 'bold', halign: 'center' } },
    { content: `${totalAmt.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } },
  ])

  autoTable(doc, {
    startY: 35,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 22 }, // dep date
      1: { cellWidth: 14 }, // dep time
      2: { cellWidth: 28 }, // dep place (blank — user fills)
      3: { cellWidth: 22 }, // arr date
      4: { cellWidth: 14 }, // arr time
      5: { cellWidth: 28 }, // arr place (blank — user fills)
      6: { cellWidth: 28 }, // place of stay (blank)
      7: { cellWidth: 14 }, // opp
      8: { cellWidth: 18 }, // closing
      9: { cellWidth: 16 }, // km
      10:{ cellWidth: 22 }, // rs
    },
  })

  // ── Footer note ──────────────────────────────────────────────────────────────
  const finalY = (doc.lastAutoTable?.finalY ?? 35) + 6
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100)
  doc.text(
    'Note: "Place" columns (Departure, Arrival, Place of Stay) are to be filled manually before submission.',
    14,
    finalY,
  )
  doc.setTextColor(0)

  // ── Signature lines ───────────────────────────────────────────────────────────
  const sigY = finalY + 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.line(14, sigY, 70, sigY)
  doc.line(pageW - 70, sigY, pageW - 14, sigY)
  doc.text('Employee Signature', 14, sigY + 5)
  doc.text('Authorized Signature', pageW - 14, sigY + 5, { align: 'right' })

  // ── Download ──────────────────────────────────────────────────────────────────
  const firstDate = isValid(new Date(journeys[0].startTime))
    ? format(new Date(journeys[0].startTime), 'yyyy-MM-dd')
    : 'unknown'
  const lastDate = isValid(new Date(journeys[journeys.length - 1].startTime))
    ? format(new Date(journeys[journeys.length - 1].startTime), 'yyyy-MM-dd')
    : 'unknown'
  const name = (staffName ?? 'staff').replace(/\s+/g, '-')
  const filename = `travel-claim_${name}_${firstDate}_to_${lastDate}.pdf`

  clearPendingJourneys()
  doc.save(filename)
}
