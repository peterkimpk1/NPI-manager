import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load .env.local file
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Location mapping: normalize location names
const LOCATION_MAP: Record<string, string> = {
  'Extraction': 'Extraction Room',
  'Extraction Room': 'Extraction Room',
  'Gummy': 'Gummy Room',
  'Gummy Room': 'Gummy Room',
  'Formulation': 'Formulation Room',
  'Formulation Room': 'Formulation Room',
  'Rear Storage': 'Rear Storage',
  'Office': 'Office',
  'Restroom Storage': 'Restroom Storage',
}

// Gram conversions for ingredient UOMs (converts TO grams)
const GRAM_CONVERSIONS: Record<string, number> = {
  'kg': 1000,
  'kilos': 1000,
  'g': 1,
  'grams': 1,
  'oz': 28.3495,
  'lb': 453.592,
  'gal': 3785.41,
  'L': 1000,
  'ml': 1,
}

// Sheet to category mapping
const SHEET_CATEGORY_MAP: Record<string, string> = {
  'Ingredients': 'Ingredients',
  'Packaging': 'Packaging',
  'Labels': 'Labels',
  'White Label': 'White Label',
  'Other Supplies': 'Supplies',
}

interface NpiRecord {
  name: string
  category: string
  sub_category: string | null
  location: string
  count: number
  uom: string
  pkg_size: number | null
  price: number | null
  unit_cost: number | null
  desired_count: number | null
  lead_time: string | null
  source: string | null
  staff: string | null
  gram_conversion: number | null
  notes: string | null
  needs_review: boolean
  review_source: string | null
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return isNaN(value) ? null : value
  const str = String(value).replace(/[$,<>?]/g, '').trim()
  if (str === '' || str.toLowerCase() === 'nan') return null
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function parseString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (str === '' || str.toLowerCase() === 'nan' || str.toLowerCase() === 'nat') return null
  return str
}

function normalizeLocation(location: string | null | undefined): string {
  if (!location) return 'Rear Storage'
  const trimmed = location.trim()
  return LOCATION_MAP[trimmed] || trimmed || 'Rear Storage'
}

function getGramConversion(uom: string | null, category: string): number | null {
  if (category !== 'Ingredients' || !uom) return null
  const normalized = uom.toLowerCase().trim()
  return GRAM_CONVERSIONS[normalized] ?? null
}

function isSubCategoryRow(name: string): boolean {
  return name.endsWith(':')
}

function cleanSubCategory(name: string): string {
  return name.replace(/:$/, '').trim()
}

function checkNeedsReview(notes: string | null): { needsReview: boolean; reviewSource: string | null } {
  if (!notes) return { needsReview: false, reviewSource: null }
  const match = notes.match(/\[v2:\s*([^\]]+)\]\s*Needs review/i)
  if (match) {
    return { needsReview: true, reviewSource: match[1].trim() }
  }
  return { needsReview: false, reviewSource: null }
}

function parseSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): NpiRecord[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []

  const category = SHEET_CATEGORY_MAP[sheetName]
  if (!category) return []

  const data = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[]
  const records: NpiRecord[] = []
  let currentSubCategory: string | null = null

  for (const row of data) {
    const name = parseString(row['Product'])
    if (!name) continue

    // Check if this is a sub-category header row
    if (isSubCategoryRow(name)) {
      currentSubCategory = cleanSubCategory(name)
      continue
    }

    const notes = parseString(row['Notes'])
    const { needsReview, reviewSource } = checkNeedsReview(notes)
    const uom = parseString(row['UOM']) || 'ea'
    const pkgSize = parseNumber(row['Pkg Size'])
    const price = parseNumber(row['Price'])
    // Calculate unit_cost: use explicit value, or derive from price/pkg_size
    let unitCost = parseNumber(row['Unit Cost'])
    if (unitCost === null && price !== null) {
      unitCost = pkgSize && pkgSize > 0 ? price / pkgSize : price
    }

    records.push({
      name,
      category,
      sub_category: currentSubCategory,
      location: normalizeLocation(row['Location'] as string),
      count: parseNumber(row['Count']) ?? 0,
      uom,
      pkg_size: pkgSize,
      price,
      unit_cost: unitCost,
      desired_count: parseNumber(row['Desired Stock']),
      lead_time: parseString(row['Lead Time']),
      source: parseString(row['Source']),
      staff: parseString(row['Staff']),
      gram_conversion: getGramConversion(uom, category),
      notes: notes?.replace(/\[v2:[^\]]+\]\s*Needs review/i, '').trim() || null,
      needs_review: needsReview,
      review_source: reviewSource,
    })
  }

  return records
}

async function seed() {
  console.log('Starting NPI database seed...\n')

  const filePath = path.join(process.cwd(), 'data', 'NPI_v3_Updated.xlsx')

  if (!fs.existsSync(filePath)) {
    console.error('ERROR: Place NPI_v3_Updated.xlsx in the /data folder')
    process.exit(1)
  }

  const workbook = XLSX.readFile(filePath)

  // Parse all sheets
  const allRecords: NpiRecord[] = []
  for (const sheetName of workbook.SheetNames) {
    const records = parseSheet(workbook, sheetName)
    allRecords.push(...records)
    console.log(`Parsed ${records.length} records from ${sheetName}`)
  }

  console.log(`\nTotal records: ${allRecords.length}`)
  console.log(`Items needing review: ${allRecords.filter(r => r.needs_review).length}\n`)

  // Get lookup tables
  const { data: categories } = await supabase.from('categories').select('id, name')
  const { data: subCategories } = await supabase.from('sub_categories').select('id, name, category_id')
  const { data: locations } = await supabase.from('locations').select('id, name')

  if (!categories || !locations) {
    console.error('ERROR: Could not load categories/locations')
    process.exit(1)
  }

  const categoryMap = new Map(categories.map(c => [c.name, c.id]))
  const locationMap = new Map(locations.map(l => [l.name, l.id]))

  // Build sub-category lookup: "CategoryName|SubCategoryName" -> id
  const subCategoryMap = new Map<string, string>()
  if (subCategories) {
    for (const sc of subCategories) {
      const cat = categories.find(c => c.id === sc.category_id)
      if (cat) {
        subCategoryMap.set(`${cat.name}|${sc.name}`, sc.id)
      }
    }
  }

  // Insert records
  let inserted = 0
  let skipped = 0
  let errors = 0
  let reviewItems = 0

  for (const record of allRecords) {
    const categoryId = categoryMap.get(record.category)
    let locationId = locationMap.get(record.location)

    // Fallback to Rear Storage if location not found
    if (!locationId) {
      locationId = locationMap.get('Rear Storage')
    }

    if (!categoryId) {
      console.warn(`SKIP: ${record.name} - invalid category "${record.category}"`)
      skipped++
      continue
    }

    // Get sub-category ID
    let subCategoryId: string | null = null
    if (record.sub_category) {
      subCategoryId = subCategoryMap.get(`${record.category}|${record.sub_category}`) || null
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('npi_items')
      .select('id')
      .ilike('name', record.name)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`SKIP (duplicate): ${record.name}`)
      skipped++
      continue
    }

    // Insert item
    const { data: newItem, error } = await supabase
      .from('npi_items')
      .insert({
        name: record.name,
        category: record.category,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        location: record.location,
        location_id: locationId,
        count: record.count,
        uom: record.uom,
        pkg_size: record.pkg_size,
        price: record.price,
        unit_cost: record.unit_cost ?? 0,
        desired_count: record.desired_count,
        lead_time: record.lead_time,
        source: record.source,
        staff: record.staff,
        gram_conversion: record.gram_conversion,
        notes: record.notes,
        needs_review: record.needs_review,
        review_source: record.review_source,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error(`ERROR: ${record.name} - ${error.message}`)
      errors++
      continue
    }

    // Create initial stock movement if count > 0
    if (newItem && record.count > 0) {
      await supabase.from('stock_movements').insert({
        npi_item_id: newItem.id,
        quantity: record.count,
        previous_count: 0,
        new_count: record.count,
        movement_type: 'initial',
        notes: 'Initial seed from Excel import',
      })
    }

    if (record.needs_review) {
      console.log(`INSERT (needs review): ${record.name}`)
      reviewItems++
    } else {
      console.log(`INSERT: ${record.name} (${record.count} ${record.uom})`)
    }
    inserted++
  }

  console.log('\n========== SEED COMPLETE ==========')
  console.log(`Total records: ${allRecords.length}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`  - Ready: ${inserted - reviewItems}`)
  console.log(`  - Needs Review: ${reviewItems}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

seed().catch(console.error)
