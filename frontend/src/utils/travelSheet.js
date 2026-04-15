/**
 * Travel claim sheet utilities.
 *
 * Pending journeys are stored in localStorage under PENDING_KEY.
 * Each journey = { startTime, endTime, totalKm }
 *
 * printTravelSheet() fills all pending journeys into the template,
 * downloads the xlsx, then clears the pending list.
 */
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const TEMPLATE_URL = '/templates/travel-claim.xlsx'
const PENDING_KEY  = 'travel_pending_journeys'
const DATA_START_ROW = 11   // first data row in template

// ── Pending journey storage ────────────────────────────────────────────────────

export function getPendingJourneys() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addPendingJourney(journey) {
  const list = getPendingJourneys()
  list.push(journey)
  localStorage.setItem(PENDING_KEY, JSON.stringify(list))
}

export function clearPendingJourneys() {
  localStorage.removeItem(PENDING_KEY)
}

// ── Sheet generation ───────────────────────────────────────────────────────────

/**
 * Downloads the travel claim xlsx filled with all pending journeys,
 * then clears the pending list.
 *
 * @param {string} staffName - used in filename
 */
export async function printTravelSheet(staffName) {
  const journeys = getPendingJourneys()
  if (journeys.length === 0) throw new Error('No journeys recorded yet.')

  const res = await fetch(TEMPLATE_URL)
  if (!res.ok) throw new Error('Could not load travel claim template.')
  const arrayBuffer = await res.arrayBuffer()

  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[0]]

  journeys.forEach((journey, index) => {
    const row = DATA_START_ROW + index
    const startDate = new Date(journey.startTime)
    const endDate   = new Date(journey.endTime)
    const km        = parseFloat(journey.totalKm.toFixed(2))

    setCellText(ws, `B${row}`, format(startDate, 'dd/MM/yyyy'))
    setCellText(ws, `C${row}`, format(startDate, 'HH:mm'))
    setCellText(ws, `E${row}`, format(endDate,   'dd/MM/yyyy'))
    setCellText(ws, `F${row}`, format(endDate,   'HH:mm'))

    // Opening = 0, Closing = km → formula K=J-I gives correct km
    setCellNumber(ws, `I${row}`, 0)
    setCellNumber(ws, `J${row}`, km)

    // Row 11 has K hardcoded (value 1), not a formula — overwrite directly
    if (row === DATA_START_ROW) {
      setCellNumber(ws, `K${row}`, km)
    }
    // Rows 12+ already have K=J-I formula, Excel recalculates on open
  })

  const firstDate = format(new Date(journeys[0].startTime), 'yyyy-MM-dd')
  const lastDate  = format(new Date(journeys[journeys.length - 1].startTime), 'yyyy-MM-dd')
  const name      = (staffName ?? 'staff').replace(/\s+/g, '-')
  const filename  = `travel-claim_${name}_${firstDate}_to_${lastDate}.xlsx`

  XLSX.writeFile(wb, filename)
  clearPendingJourneys()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function setCellText(ws, addr, value) {
  if (!ws[addr]) ws[addr] = {}
  ws[addr].t = 's'
  ws[addr].v = value
  ws[addr].w = value
  delete ws[addr].f
}

function setCellNumber(ws, addr, value) {
  if (!ws[addr]) ws[addr] = {}
  ws[addr].t = 'n'
  ws[addr].v = value
  ws[addr].w = String(value)
  delete ws[addr].f
}
