const UNIT_CODES = {
  pcs: 'pcs',
  piece: 'pcs',
  pieces: 'pcs',
  carton: 'carton',
  cartons: 'carton',
  dozen: 'dozen',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  kl: 'kg',
  litre: 'litre',
  liter: 'litre',
  liters: 'litre',
  litres: 'litre',
  littre: 'litre',
  metre: 'metre',
  meter: 'metre',
  meters: 'metre',
  metres: 'metre',
};

export const IMPORTS = {
  products: {
    url: '/api/products/import',
    filename: 'products-template.xlsx',
    sheet: 'Products',
    title: 'Import products',
    help: 'Columns: sku, name, unit, price. Unit can be pcs, carton, dozen, kg, litre, or metre. Leave price empty when the seller should type it at the sale.',
    headers: ['sku', 'name', 'unit', 'price'],
    sample: ['HBR-010', 'Dock Hook', 'pcs', 12.5],
    fields: {
      sku: ['sku', 'code', 'product code'],
      name: ['name', 'product', 'product name'],
      unit: ['unit', 'unit of measurement', 'uom'],
      price: ['price', 'unit price'],
    },
  },
  customers: {
    url: '/api/customers/import',
    filename: 'customers-template.xlsx',
    sheet: 'Customers',
    title: 'Import customers',
    help: 'Columns: tin, name. Name is the organization. The walking customer is not in this file.',
    headers: ['tin', 'name'],
    sample: ['1002003010', 'South Pier Traders'],
    fields: {
      tin: ['tin', 'tax id', 'tax identification number'],
      name: ['name', 'organization', 'organization name', 'customer'],
    },
  },
  suppliers: {
    url: '/api/suppliers/import',
    filename: 'suppliers-template.xlsx',
    sheet: 'Suppliers',
    title: 'Import suppliers',
    help: 'Columns: tin, name. Name is the supplier organization.',
    headers: ['tin', 'name'],
    sample: ['2003004010', 'North Rope Supply'],
    fields: {
      tin: ['tin', 'tax id', 'tax identification number'],
      name: ['name', 'organization', 'organization name', 'supplier'],
    },
  },
  shops: {
    url: '/api/branches/import',
    filename: 'shops-template.xlsx',
    sheet: 'Shops',
    title: 'Import shops',
    help: 'Columns: name, location. Location is the address.',
    headers: ['name', 'location'],
    sample: ['Main shop', '1 Market Street'],
    fields: {
      name: ['name', 'shop', 'shop name'],
      location: ['location', 'address'],
    },
  },
  stock: {
    url: '/api/inventory/import',
    filename: 'stock-template.xlsx',
    sheet: 'Stock',
    title: 'Import stock',
    help: 'Columns: shop, sku, quantity. The shop and the product must already exist. The quantity replaces what is on hand in that shop.',
    headers: ['shop', 'sku', 'quantity'],
    sample: ['Main shop', 'SKU-001', 12],
    fields: {
      shop: ['shop', 'shop name', 'store'],
      sku: ['sku', 'code', 'product code'],
      quantity: ['quantity', 'qty', 'stock', 'on hand'],
    },
  },
};

function headerKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ');
}

function cellText(value) {
  if (value == null) return '';
  return String(value).trim();
}

function moneyText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const cents = Math.round(value * 100);
    return (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }
  const text = cellText(value).replace(/^\d+,\d{1,2}$/, (match) => match.replace(',', '.'));
  return text;
}

function wholeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cellText(value);
  if (!/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

function findColumns(headerRow, fields) {
  const indexes = {};
  const missing = [];
  headerRow.forEach((cell, index) => {
    const key = headerKey(cell);
    for (const [field, names] of Object.entries(fields)) {
      if (indexes[field] == null && names.includes(key)) indexes[field] = index;
    }
  });
  for (const field of Object.keys(fields)) {
    if (indexes[field] == null) missing.push(field);
  }
  return { indexes, missing };
}

function readField(line, indexes, field) {
  const index = indexes[field];
  if (index == null) return '';
  return line[index];
}

export function parseMatrix(matrix, kind) {
  const spec = IMPORTS[kind];
  if (!spec) return { rows: [], errors: [{ row: 1, message: 'This import is not set up' }] };
  const grid = Array.isArray(matrix) ? matrix : [];
  const header = grid[0] || [];
  const { indexes, missing } = findColumns(header, spec.fields);
  if (grid.length === 0 || header.every((cell) => cellText(cell) === '')) {
    return { rows: [], errors: [{ row: 1, message: 'The first row must be the column names. Download the template.' }] };
  }
  if (missing.length > 0) {
    return { rows: [], errors: [{ row: 1, message: `Add these columns: ${missing.join(', ')}. Download the template.` }] };
  }

  const rows = [];
  const errors = [];
  const seen = new Set();
  const dataLines = grid.slice(1, 501);
  if (grid.length > 501) {
    errors.push({ row: 502, message: 'Only 500 rows can be imported at once' });
  }

  dataLines.forEach((line, offset) => {
    const row = offset + 2;
    const values = spec.headers.map((field) => readField(line, indexes, field));
    if (values.every((value) => cellText(value) === '' && typeof value !== 'number')) return;

    if (kind === 'products') {
      const sku = cellText(readField(line, indexes, 'sku'));
      const name = cellText(readField(line, indexes, 'name'));
      const unit = UNIT_CODES[headerKey(readField(line, indexes, 'unit'))] || '';
      const price = moneyText(readField(line, indexes, 'price'));
      if (!sku || !name) errors.push({ row, message: 'SKU and name are required' });
      if (!unit) errors.push({ row, message: 'Unit must be pcs, carton, dozen, kg, litre, or metre' });
      if (price !== '' && !/^\d+(\.\d{1,2})?$/.test(price)) errors.push({ row, message: 'Price must look like 45.34, or be left empty' });
      if (sku && seen.has(`sku:${sku.toLowerCase()}`)) errors.push({ row, message: 'This SKU is repeated in the file' });
      if (sku) seen.add(`sku:${sku.toLowerCase()}`);
      if (sku && name && unit && (price === '' || /^\d+(\.\d{1,2})?$/.test(price))) {
        rows.push({ row, sku, name, unit, price });
      }
      return;
    }

    if (kind === 'customers' || kind === 'suppliers') {
      const tin = cellText(readField(line, indexes, 'tin'));
      const name = cellText(readField(line, indexes, 'name'));
      if (!tin || !name) errors.push({ row, message: 'TIN and organization name are required' });
      if (tin && seen.has(tin.toLowerCase())) errors.push({ row, message: 'This TIN is repeated in the file' });
      if (tin) seen.add(tin.toLowerCase());
      if (tin && name) rows.push({ row, tin, name });
      return;
    }

    if (kind === 'shops') {
      const name = cellText(readField(line, indexes, 'name'));
      const location = cellText(readField(line, indexes, 'location'));
      if (!name || !location) errors.push({ row, message: 'Shop name and address are required' });
      if (name && seen.has(name.toLowerCase())) errors.push({ row, message: 'This shop name is repeated in the file' });
      if (name) seen.add(name.toLowerCase());
      if (name && location) rows.push({ row, name, location });
      return;
    }

    const shop = cellText(readField(line, indexes, 'shop'));
    const sku = cellText(readField(line, indexes, 'sku'));
    const quantity = wholeNumber(readField(line, indexes, 'quantity'));
    if (!shop || !sku) errors.push({ row, message: 'Shop and SKU are required' });
    if (!Number.isInteger(quantity) || quantity < 0) errors.push({ row, message: 'Quantity must be a whole number, 0 or more' });
    const key = `${shop.toLowerCase()}|${sku.toLowerCase()}`;
    if (shop && sku && seen.has(key)) errors.push({ row, message: 'This shop and SKU are repeated in the file' });
    if (shop && sku) seen.add(key);
    if (shop && sku && Number.isInteger(quantity) && quantity >= 0) rows.push({ row, shop, sku, quantity });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ row: 2, message: 'The file has no rows under the column names.' });
  }
  const blocked = new Set(errors.map((error) => error.row));
  return { rows: rows.filter((item) => !blocked.has(item.row)), errors };
}

export async function parseFile(file, kind) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const name = book.SheetNames[0];
  if (!name) return { rows: [], errors: [{ row: 1, message: 'The file has no sheet' }] };
  const matrix = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: true, defval: '' });
  return parseMatrix(matrix, kind);
}

export async function downloadTemplate(kind) {
  const spec = IMPORTS[kind];
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([spec.headers, spec.sample]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, spec.sheet);
  XLSX.writeFile(book, spec.filename);
}
