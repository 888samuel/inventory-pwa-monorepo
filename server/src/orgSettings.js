export async function priceModeFor(client, organizationId) {
  const result = await client.query(
    `SELECT price_mode FROM organizations WHERE id = $1`,
    [organizationId]
  );
  return result.rows[0]?.price_mode === 'fixed' ? 'fixed' : 'dynamic';
}

export function pricedCents(priceMode, productCents, rawPrice) {
  if (priceMode === 'fixed') {
    if (productCents == null) return { error: 'Set a price on this product' };
    return { cents: productCents };
  }
  const raw = String(rawPrice ?? '').trim();
  let cents = productCents;
  if (raw !== '') {
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: 'Enter a unit price like 45.34' };
    cents = Math.round(Number(raw) * 100);
  }
  if (cents == null) return { error: 'Enter a unit price like 45.34' };
  return { cents };
}

export async function canonicalBank(client, organizationId, raw) {
  const name = String(raw || '').trim();
  if (!name) return { error: 'Choose a bank' };
  const result = await client.query(
    `SELECT name FROM banks
     WHERE organization_id = $1 AND lower(name) = lower($2)`,
    [organizationId, name]
  );
  if (result.rows.length === 0) return { error: 'Choose a bank from Settings' };
  return { name: result.rows[0].name };
}
