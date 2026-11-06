'use client';

import { useEffect, useState } from 'react';

export function TransferScreen({ shops, products, units, onChanged }) {
  const unitChoices = units.length > 0 ? units : [
    { code: 'pcs', name: 'Piece' },
    { code: 'carton', name: 'Carton' },
    { code: 'dozen', name: 'Dozen' },
    { code: 'kg', name: 'Kilogram' },
    { code: 'litre', name: 'Litre' },
    { code: 'metre', name: 'Metre' },
  ];
  const [view, setView] = useState('order');
  const [fromShop, setFromShop] = useState(shops[0]?.name || '');
  const [toShop, setToShop] = useState('');
  const [companyShops, setCompanyShops] = useState([]);
  const [stock, setStock] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const [unit, setUnit] = useState('pcs');
  const [qty, setQty] = useState('1');
  const [ready, setReady] = useState(false);
  const [canOrder, setCanOrder] = useState(false);
  const [canConfirm, setCanConfirm] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (shops.some((shop) => shop.name === fromShop)) return;
    setFromShop(shops[0]?.name || '');
  }, [shops, fromShop]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/transfers', { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setCanOrder(false);
          setCanConfirm(false);
          setIncoming([]);
          setOutgoing([]);
          setReady(true);
          setError(data.error || 'Transfers are not available yet');
          return;
        }
        setCanOrder(Boolean(data.canOrder));
        setCanConfirm(Boolean(data.canConfirm));
        setCompanyShops(Array.isArray(data.shops) ? data.shops : []);
        setIncoming(Array.isArray(data.incoming) ? data.incoming : []);
        setOutgoing(Array.isArray(data.outgoing) ? data.outgoing : []);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
          setError('Transfers are not available yet');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  useEffect(() => {
    if (!fromShop) return undefined;
    const params = new URLSearchParams({ shop: fromShop });
    let cancelled = false;
    fetch(`/api/inventory?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!cancelled) setStock(response.ok && Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStock([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fromShop, revision]);

  const destinations = companyShops.filter((shop) => shop.name !== fromShop);
  useEffect(() => {
    if (destinations.some((shop) => shop.name === toShop)) return;
    setToShop(destinations[0]?.name || '');
  }, [fromShop, companyShops, toShop, destinations]);

  const product = products.find((item) => String(item.id) === String(productId)) || null;
  const productNeedle = productQuery.trim().toLowerCase();
  const productChoices = products.filter((item) => !productNeedle || (product && productNeedle === item.name.toLowerCase()) || item.name.toLowerCase().includes(productNeedle));
  const onHand = stock.find((item) => String(item.id) === String(productId));
  const available = onHand?.quantity ?? 0;

  async function onOrder(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const quantity = Number(qty);
    if (!canOrder) {
      setError('You cannot order a transfer');
      return;
    }
    if (!fromShop || !toShop || !product) {
      setError('Choose two shops and a product');
      return;
    }
    if (fromShop === toShop) {
      setError('Choose two different shops');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be a whole number');
      return;
    }
    if (unit !== product.unit) {
      setError(`This product is counted in ${product.unit}`);
      return;
    }
    if (quantity > available) {
      setError(`Only ${available} left in ${fromShop}`);
      return;
    }
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fromShop,
        toShop,
        productId: product.id,
        unit,
        quantity,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not order the transfer');
      return;
    }
    setQty('1');
    setNotice(`Ordered ${data.quantity} ${data.unit} of ${data.name} from ${data.fromShop} to ${data.toShop}. Stock moves when ${data.toShop} accepts it.`);
    setView('confirm');
    setRevision((version) => version + 1);
  }

  async function onAccept(id) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/transfers/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not confirm the transfer');
      return;
    }
    setNotice(`Accepted. ${data.quantity} ${data.unit} of ${data.name} moved from ${data.fromShop} to ${data.toShop}. ${data.sourceOnHand} left in ${data.fromShop}. ${data.destinationOnHand} now in ${data.toShop}.`);
    setRevision((version) => version + 1);
    onChanged();
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Transfer</h1>
      <p className="mt-1 text-sm text-slate-500">Order stock from one shop to another. It moves when the receiving shop accepts it.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 text-sm text-teal-800">{notice}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className={`rounded px-3 py-2 text-sm ${view === 'order' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setView('order')}>Order transfer</button>
        <button type="button" className={`rounded px-3 py-2 text-sm ${view === 'confirm' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setView('confirm')}>Transfers to confirm</button>
      </div>
      {view === 'order' && (
        <form onSubmit={onOrder} className="mt-4 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {ready && !canOrder && <p className="text-sm text-slate-600">You cannot order a transfer.</p>}
          <label className="block text-sm text-slate-600">
            From shop
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={fromShop} onChange={(event) => setFromShop(event.target.value)}>
              {shops.map((shop) => (
                <option key={shop.name} value={shop.name}>{shop.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            To shop
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={toShop} onChange={(event) => setToShop(event.target.value)}>
              {destinations.map((shop) => (
                <option key={shop.name} value={shop.name}>{shop.name}</option>
              ))}
            </select>
          </label>
          <div className="relative">
            <label className="block text-sm text-slate-600" htmlFor="transfer-product">Product</label>
            <div className="mt-1 flex">
              <input
                id="transfer-product"
                className="w-full rounded-l border border-slate-300 px-3 py-2"
                value={productQuery}
                placeholder="Search or choose a product"
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  setProductId('');
                  setProductOpen(true);
                }}
                onFocus={() => setProductOpen(true)}
              />
              <button type="button" className="rounded-r border border-l-0 border-slate-300 px-3" aria-label="Open product list" onClick={() => setProductOpen((open) => !open)}>▾</button>
            </div>
            {productOpen && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                {productChoices.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setProductId(String(item.id));
                        setProductQuery(item.name);
                        if (item.unit) setUnit(item.unit);
                        setProductOpen(false);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
                {productChoices.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No product with that name</li>}
              </ul>
            )}
            {product && <span className="mt-1 block text-xs text-slate-500">{product.sku}</span>}
          </div>
          <label className="block text-sm text-slate-600">
            Unit
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={unit} onChange={(event) => setUnit(event.target.value)}>
              {unitChoices.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
            {product && unit !== product.unit && <span className="mt-1 block text-xs text-red-700">This product is counted in {product.unit}.</span>}
          </label>
          <label className="block text-sm text-slate-600">
            Quantity
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={qty} onChange={(event) => setQty(event.target.value)} inputMode="numeric" />
            {product && fromShop && <span className={`mt-1 block text-xs ${Number(qty) > available ? 'text-red-700' : 'text-slate-500'}`}>{available} {product.unit} in {fromShop}</span>}
          </label>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-400" type="submit" disabled={!ready || !canOrder}>Order transfer</button>
        </form>
      )}
      {view === 'confirm' && (
        <div className="mt-4 max-w-lg space-y-6">
          <section>
            <h2 className="text-sm font-medium text-slate-900">Waiting for this shop to accept</h2>
            {ready && !canConfirm && <p className="mt-2 text-sm text-slate-600">You cannot confirm a transfer.</p>}
            <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {incoming.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.quantity} {item.unit} of {item.product}</p>
                    <p className="text-sm text-slate-500">{item.from_shop} to {item.to_shop}</p>
                  </div>
                  {canConfirm && (
                    <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => onAccept(item.id)}>Accept</button>
                  )}
                </li>
              ))}
              {incoming.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No transfer is waiting to be accepted.</li>}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-medium text-slate-900">Ordered from your shops</h2>
            <ul className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {outgoing.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="font-medium text-slate-900">{item.quantity} {item.unit} of {item.product}</p>
                  <p className="text-sm text-slate-500">{item.from_shop} to {item.to_shop}. Waiting for {item.to_shop} to accept.</p>
                </li>
              ))}
              {outgoing.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No transfer is waiting to leave your shops.</li>}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
