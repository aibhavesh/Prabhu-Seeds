import * as XLSX from 'xlsx'
import { format, isValid } from 'date-fns'

const TEMPLATE_URL    = '/templates/travel-claim.xlsx'
const PENDING_KEY     = 'travel_pending_journeys'
const DATA_START_ROW  = 11
export const RATE_PER_KM = 3.25

// ── Pending journey storage ────────────────────────────────────────────────────

export function getPendingJourneys() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    // Validate each entry has valid timestamps and km
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
  } catch (e) {
    // localStorage full or unavailable — throw so caller can surface it
    throw new Error('Could not save journey locally. Storage may be full.')
  }
}

export function clearPendingJourneys() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
}

// ── Sheet generation ───────────────────────────────────────────────────────────

/**
 * Fills the travel claim template with all pending journeys and downloads it.
 * Clears the pending list ONLY after the file is ready to write (minimises data loss).
 */
export async function printTravelSheet(staffName) {
  const journeys = getPendingJourneys()
  if (journeys.length === 0) throw new Error('No journeys queued for printing yet.')

  const res = await fetch(TEMPLATE_URL)
  if (!res.ok) throw new Error('Could not load travel claim template.')
  const arrayBuffer = await res.arrayBuffer()

  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[0]]

  journeys.forEach((journey, index) => {
    const row       = DATA_START_ROW + index
    const startDate = new Date(journey.startTime)
    const endDate   = new Date(journey.endTime)
    const km        = parseFloat(Math.max(0, journey.totalKm).toFixed(2))

    // Guard invalid dates
    if (!isValid(startDate) || !isValid(endDate)) return

    setCellText(ws, `B${row}`, format(startDate, 'dd/MM/yyyy'))
    setCellText(ws, `C${row}`, format(startDate, 'HH:mm'))
    setCellText(ws, `E${row}`, format(endDate,   'dd/MM/yyyy'))
    setCellText(ws, `F${row}`, format(endDate,   'HH:mm'))

    // I = opening odometer (0), J = closing (km) → K formula = J-I = km
    setCellNumber(ws, `I${row}`, 0)
    setCellNumber(ws, `J${row}`, km)

    // Row 11 has K hardcoded (not a formula) — overwrite it directly
    if (row === DATA_START_ROW) {
      setCellNumber(ws, `K${row}`, km)
    }
    // Rows 12+ have K=J-I formula — Excel recalculates on open
  })

  // Build filename from first and last journey date
  const first    = new Date(journeys[0].startTime)
  const last     = new Date(journeys[journeys.length - 1].startTime)
  const name     = (staffName ?? 'staff').replace(/\s+/g, '-')
  const fromStr  = isValid(first) ? format(first, 'yyyy-MM-dd') : 'unknown'
  const toStr    = isValid(last)  ? format(last,  'yyyy-MM-dd') : 'unknown'
  const filename = `travel-claim_${name}_${fromStr}_to_${toStr}.xlsx`

  // Clear BEFORE writeFile — if writeFile throws the file was never created anyway
  clearPendingJourneys()
  XLSX.writeFile(wb, filename)
}

// ── Cell helpers ───────────────────────────────────────────────────────────────

function setCellText(ws, addr, value) {
  ws[addr] = { t: 's', v: value, w: value }
}

function setCellNumber(ws, addr, value) {
  ws[addr] = { t: 'n', v: value, w: String(value) }
}
