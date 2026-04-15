/**
 * Fills the travel claim Excel template with journey data and triggers download.
 *
 * Template: /templates/travel-claim.xlsx
 * Data rows start at row 11. Per row:
 *   B = departure date   C = departure time
 *   E = arrival date     F = arrival time
 *   D, G, H = blank (user fills place / place of stay manually)
 *   I = opening km (0)   J = closing km (=distance)
 *   K = km (formula =J-I in rows 12+; row 11 is hardcoded so we write directly)
 *   L = Rs (formula =K*3.25, no touch needed)
 */
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const TEMPLATE_URL = '/templates/travel-claim.xlsx'
const DATA_START_ROW = 11   // 1-based

/**
 * @param {object} journey
 * @param {number} journey.startTime   - Date.now() ms timestamp
 * @param {number} journey.endTime     - Date.now() ms timestamp
 * @param {number} journey.totalKm     - distance in km
 * @param {string} journey.staffName   - for filename only
 */
export async function downloadTravelSheet({ startTime, endTime, totalKm, staffName }) {
  // 1. Load template bytes
  const res = await fetch(TEMPLATE_URL)
  if (!res.ok) throw new Error('Could not load travel claim template.')
  const arrayBuffer = await res.arrayBuffer()

  // 2. Parse workbook (keep formulas intact)
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellStyles: true })
  const ws = wb.Sheets[wb.SheetNames[0]]

  const startDate = new Date(startTime)
  const endDate   = new Date(endTime)

  const depDate = format(startDate, 'dd/MM/yyyy')
  const depTime = format(startDate, 'HH:mm')
  const arrDate = format(endDate,   'dd/MM/yyyy')
  const arrTime = format(endDate,   'HH:mm')
  const km      = parseFloat(totalKm.toFixed(2))

  // 3. Find first available data row (B column empty = row unused)
  let targetRow = DATA_START_ROW
  for (let r = DATA_START_ROW; r <= DATA_START_ROW + 29; r++) {
    const cell = ws[`B${r}`]
    if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
      targetRow = r
      break
    }
    targetRow = r + 1 // append after last used row
  }

  // 4. Write departure / arrival / km
  setCellText(ws, `B${targetRow}`, depDate)
  setCellText(ws, `C${targetRow}`, depTime)
  setCellText(ws, `E${targetRow}`, arrDate)
  setCellText(ws, `F${targetRow}`, arrTime)

  // Opening odometer = 0, Closing = km so formula K=J-I gives correct km
  setCellNumber(ws, `I${targetRow}`, 0)
  setCellNumber(ws, `J${targetRow}`, km)

  // Row 11 has K hardcoded (=1), not a formula — overwrite directly
  if (targetRow === DATA_START_ROW) {
    setCellNumber(ws, `K${targetRow}`, km)
  }
  // Rows 12+ have K=J-I formula — Excel recalculates on open, no change needed

  // 5. Download
  const dateStr = format(startDate, 'yyyy-MM-dd')
  const filename = `travel-claim_${(staffName ?? 'staff').replace(/\s+/g, '-')}_${dateStr}.xlsx`
  XLSX.writeFile(wb, filename)
}

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
