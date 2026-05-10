/**
 * Travel claim PDF + Excel generator.
 * Replicates the company template layout (Sheet 3 of travel-claim.xlsx).
 *
 * Pending journeys are stored in localStorage under PENDING_KEY.
 * printTravelPDF() / exportTravelExcel() generate the file, download it,
 * then clear the pending list.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format, isValid } from 'date-fns'

const PENDING_KEY    = 'travel_pending_journeys'
const LOGO_URL       = '/templates/travel-logo.png'
const TEMPLATE_URL   = '/templates/travel-claim.xlsx'
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

// ── Shared helpers ─────────────────────────────────────────────────────────────

function journeyRows(journeys) {
  let totalKm = 0, totalAmt = 0
  const rows = journeys.map((j) => {
    const startDate = new Date(j.startTime)
    const endDate   = new Date(j.endTime)
    const km        = parseFloat(Math.max(0, j.totalKm).toFixed(1))
    // Use the amount that was actually submitted to the backend if stored,
    // otherwise re-derive it from km × rate.
    const amt       = typeof j.amount === 'number'
      ? j.amount
      : parseFloat((km * RATE_PER_KM).toFixed(2))
    totalKm  += km
    totalAmt += amt
    return { startDate, endDate, km, amt }
  })
  return { rows, totalKm, totalAmt }
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
  const { rows, totalKm, totalAmt } = journeyRows(journeys)

  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()   // 297
  const margin = 10

  // ── Logo ────────────────────────────────────────────────────────────────────
  let headerEndY = margin
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, margin, 47, 21)
    headerEndY = margin + 21
  }

  // ── Company name & title ────────────────────────────────────────────────────
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
      // Place of Stay spans from above
      'Opp.', 'Closing', 'Km',
      // Rs. spans from above
    ],
  ]

  const body = rows.map(({ startDate, endDate, km, amt }) => [
    isValid(startDate) ? format(startDate, 'dd/MM/yy') : '',
    isValid(startDate) ? format(startDate, 'HH:mm')    : '',
    '', // Place — user fills manually
    isValid(endDate)   ? format(endDate,   'dd/MM/yy') : '',
    isValid(endDate)   ? format(endDate,   'HH:mm')    : '',
    '', // Place — user fills manually
    '', // Place of stay — user fills manually
    '', // Opp.    — left blank (odometer entry is manual)
    '', // Closing — left blank (odometer entry is manual)
    km.toFixed(1),        // Km  — actual km tracked by GPS
    `₹${amt.toFixed(2)}`, // Rs. — actual amount submitted
  ])

  // Total row — colSpan 9 covers everything up to and including Closing
  body.push([
    {
      content: 'Total Claim',
      colSpan: 9,
      styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] },
    },
    { content: totalKm.toFixed(1),         styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 245, 245] } },
    { content: `₹${totalAmt.toFixed(2)}`,  styles: { fontStyle: 'bold', halign: 'right',  fillColor: [245, 245, 245] } },
  ])

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: 'grid',
    styles:     { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { textColor: 0,  fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0:  { cellWidth: 20 }, // dep date
      1:  { cellWidth: 13 }, // dep time
      2:  { cellWidth: 30 }, // dep place
      3:  { cellWidth: 20 }, // arr date
      4:  { cellWidth: 13 }, // arr time
      5:  { cellWidth: 30 }, // arr place
      6:  { cellWidth: 30 }, // place of stay
      7:  { cellWidth: 13 }, // opp    (blank)
      8:  { cellWidth: 18 }, // closing (blank)
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

  doc.line(margin, sigY, margin + 55, sigY)
  doc.text('TOURING PERSON', margin, sigY + 4)

  doc.line(margin + 70, sigY, margin + 135, sigY)
  doc.text('HEAD OF DEPARTMENT', margin + 70, sigY + 4)

  doc.line(margin + 155, sigY, pageW - margin, sigY)
  doc.text('ACCOUNTS DEPTT.', margin + 155, sigY + 4)

  // ── Note ─────────────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120)
  doc.text(
    'Note: "Place" columns (Departure, Arrival, Place of Stay), Opp. and Closing are to be filled manually before submission.',
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

// ── Excel generation (fills Sheet 3 of the company template) ──────────────────

export async function exportTravelExcel(staffName) {
  const journeys = getPendingJourneys()
  if (journeys.length === 0) throw new Error('No journeys queued for export yet.')

  const { rows, totalKm, totalAmt } = journeyRows(journeys)

  // Fetch and parse the company template so all formatting is preserved
  const response    = await fetch(TEMPLATE_URL)
  const arrayBuffer = await response.arrayBuffer()
  const wb          = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true })

  // Sheet 3 (index 2) is the travel claim form
  const wsName = wb.SheetNames[2]
  const ws     = wb.Sheets[wsName]

  // Helper — overwrites a cell's value while keeping its existing style
  function writeCell(ref, value, type = 's') {
    const existing = ws[ref] ?? {}
    ws[ref] = { ...existing, t: type, v: value }
    delete ws[ref].f  // remove any formula so value takes precedence
    delete ws[ref].w  // remove cached formatted text so Excel re-renders
  }

  // ── Header fields ────────────────────────────────────────────────────────────
  writeCell('P5', format(new Date(), 'dd/MM/yyyy'))  // Date
  writeCell('C6', staffName ?? '')                   // Name (after the "Name" label at B6)

  // ── Clear all placeholder values in data rows 11-40 ─────────────────────────
  const DATA_COLS = ['B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R']
  for (let r = 11; r <= 40; r++) {
    DATA_COLS.forEach((col) => {
      const ref = `${col}${r}`
      if (ws[ref]) {
        ws[ref] = { ...ws[ref], t: 's', v: '', w: '' }
        delete ws[ref].f
      }
    })
  }

  // ── Write journey rows starting at row 11 ────────────────────────────────────
  rows.forEach(({ startDate, endDate, km, amt }, idx) => {
    const r = 11 + idx
    if (r > 40) return   // template has 30 data rows max

    writeCell(`B${r}`, isValid(startDate) ? format(startDate, 'dd/MM/yy') : '')
    writeCell(`C${r}`, isValid(startDate) ? format(startDate, 'HH:mm')    : '')
    // D = Departure Place  — left blank for manual entry
    writeCell(`E${r}`, isValid(endDate)   ? format(endDate,   'dd/MM/yy') : '')
    writeCell(`F${r}`, isValid(endDate)   ? format(endDate,   'HH:mm')    : '')
    // G = Arrival Place    — left blank for manual entry
    // H = Place of Stay    — left blank for manual entry
    // I = Opp.             — left blank (odometer, manual)
    // J = Closing          — left blank (odometer, manual)
    writeCell(`K${r}`, km,  'n')   // Km  — actual tracked distance
    writeCell(`L${r}`, amt, 'n')   // Rs. — actual travel cost
    writeCell(`R${r}`, amt, 'n')   // Amount column (same as Rs. for motor travel)
  })

  // ── Total row — write below the last journey row ──────────────────────────────
  const totalRow = 11 + rows.length
  if (totalRow <= 41) {
    writeCell(`J${totalRow}`, 'Total',        's')
    writeCell(`K${totalRow}`, totalKm,        'n')
    writeCell(`L${totalRow}`, totalAmt,       'n')
    writeCell(`R${totalRow}`, totalAmt,       'n')
  }

  // ── Download ──────────────────────────────────────────────────────────────────
  const first = new Date(journeys[0].startTime)
  const name  = (staffName ?? 'staff').replace(/\s+/g, '-')
  const dt    = isValid(first) ? format(first, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  const outBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob     = new Blob([outBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = `travel-claim_${name}_${dt}.xlsx`
  a.click()
  URL.revokeObjectURL(url)

  clearPendingJourneys()
}
