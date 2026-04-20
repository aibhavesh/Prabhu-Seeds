/**
 * Activity catalog — mirrors the Backend Task Assignment Form spec.
 * Each entry defines the activity name, its metric unit, and whether
 * a Location field is required (Production & R&D Pre-Season activities).
 */

export const DEPARTMENTS = ['Marketing', 'Production', 'R&D']
export const SEASONS = ['Pre-Season', 'Post-Season']

export const ACTIVITY_CATALOG = {
  Marketing: {
    'Pre-Season': [
      { name: 'Pre Season Farmer Meeting', unit: 'NOS' },
      { name: 'Individual Farmer Contact', unit: 'NOS' },
      { name: 'Postering', unit: 'DAYS' },
      { name: 'Jeep / Rikshaw / Bike Campaign', unit: 'DAYS' },
      { name: 'Mega Farmer Meeting', unit: 'NOS' },
      { name: 'New Product Demo / Dealer Visit', unit: 'NOS' },
    ],
    'Post-Season': [
      { name: 'Retailer / Wholesaler Sale Data', unit: 'NOS' },
      { name: 'Dealer Product Wise Farmer List', unit: 'NOS' },
      { name: 'Crop Show / Mega Crop Show', unit: 'NOS' },
      { name: 'Plot Visit / Model Plot Visit', unit: 'NOS' },
      { name: 'Live Plant Display / Trail Product', unit: 'NOS' },
      { name: 'Testimonial / Yield Data', unit: 'NOS/QUINTALS' },
      { name: 'Shop / Wall / Trolly Painting', unit: 'DAYS' },
    ],
  },
  Production: {
    'Pre-Season': [
      { name: 'Foundation Seed Distribution', unit: 'NOS', requiresLocation: true },
      { name: 'Nursery Bed Preparation', unit: 'DAYS', requiresLocation: true },
      { name: 'Sowing', unit: 'DAYS', requiresLocation: true },
    ],
    'Post-Season': [
      { name: 'Farmers Field Visit / Field Inspection', unit: 'NOS' },
      { name: 'Roughing', unit: 'DAYS' },
      { name: 'De-Tasseling / Crossing / Caping', unit: 'NOS/ACRES' },
      { name: 'Harvesting / Transport / Storage', unit: 'NOS/QUINTALS' },
      { name: 'Seed Available Details for Payment', unit: 'NOS' },
    ],
  },
  'R&D': {
    'Pre-Season': [
      { name: 'Nursery Bed Preparation', unit: 'DAYS', requiresLocation: true },
      { name: 'Sowing', unit: 'DAYS', requiresLocation: true },
    ],
    'Post-Season': [
      { name: 'Transplanting', unit: 'DAYS' },
      { name: 'Fertilizer Basal Dose', unit: 'DAYS' },
      { name: 'Roughing / Crossing / Caping', unit: 'NOS/ACRES' },
      { name: 'Harvesting Male/Female Lines', unit: 'NOS/LINES' },
      { name: 'Yield Data', unit: 'NOS/QUINTALS' },
      { name: 'Threshing', unit: 'DAYS' },
      { name: 'Storage', unit: 'NOS/QUINTALS' },
      { name: 'GOT (No. of Products)', unit: 'NOS' },
    ],
  },
}

/** Returns the list of activities for a given dept+season, or []. */
export function getActivities(dept, season) {
  return ACTIVITY_CATALOG[dept]?.[season] ?? []
}

/** Returns the activity definition object by name within a dept+season. */
export function getActivity(dept, season, name) {
  return getActivities(dept, season).find((a) => a.name === name) ?? null
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep',
  'Puducherry',
]
