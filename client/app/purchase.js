'use client';

import { useEffect, useState } from 'react';
import { BankField } from './bank-field';

const money = (cents) => (Number(cents) / 100).toFixed(2);

export function PurchaseScreen({ shops, products, suppliers, units, banks = [], priceMode = 'dynamic', onChanged }) {
  const unitChoices = units.length > 0 ? units : [
    { code: 'pcs', name: 'Piece' },
    { code: 'carton', name: 'Carton' },
    { code: 'dozen', name: 'Dozen' },
    { code: 'kg', name: 'Kilogram' },
    { code: 'litre', name: 'Litre' },
    { code: 'metre', name: 'Metre' },
  ];
  const [view, setView] = useState('record');
  const [listShop, setListShop] = useState('all');
  const [listInvoice, setListInvoice] = useState('');
  const [listDate, setListDate] = useState('');
  const [completed, setCompleted] = useState([]);
  const [listNote, setListNote] = useState(null);
  const [shopName, setShopName] = useState(shops[0]?.name || '');
  const [stock, setStock] = useState([]);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [productOpen, setProductOpen] = useState(false);
  const [unit, setUnit] = useState('pcs');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [payment, setPayment] = useState('cash');
  const [creditKind, setCreditKind] = useState('full');
  const [paidNow, setPaidNow] = useState('');
  const [bank, setBank] = useState('');
  const [nextInvoice, setNextInvoice] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const [creditShop, setCreditShop] = useState(shops[0]?.name || '');
  const [creditInvoice, setCreditInvoice] = useState('');
  const [creditApplied, setCreditApplied] = useState('');
  const [creditRows, setCreditRows] = useState([]);
  const [creditNote, setCreditNote] = useState(null);
  const [payId, setPayId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payBank, setPayBank] = useState('');

  useEffect(() => {
    if (shops.some((shop) => shop.name === shopName)) return;
    setShopName(shops[0]?.name || '');
  }, [shops, shopName]);

  useEffect(() => {
    if (shops.some((shop) => shop.name === creditShop)) return;
    setCreditShop(shops[0]?.name || '');
  }, [shops, creditShop]);

  useEffect(() => {
    if (!shopName) return undefined;
    const params = new URLSearchParams({ shop: shopName });
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
  }, [shopName, revision]);

  useEffect(() => {
    if (!shopName) return undefined;
    const params = new URLSearchParams({ shop: shopName });
    let cancelled = false;
    fetch(`/api/purchases/next?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!cancelled) setNextInvoice(response.ok ? data.invoiceNumber : null);
      })
      .catch(() => {
        if (!cancelled) setNextInvoice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shopName, revision]);

  useEffect(() => {
    if (view !== 'list') return undefined;
    const invoice = listInvoice.trim();
    if (invoice && !/^\d+$/.test(invoice)) {
      setCompleted([]);
      setListNote('Invoice number must be a whole number');
      return undefined;
    }
    const params = new URLSearchParams({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    if (listShop !== 'all') params.set('shop', listShop);
    if (invoice) params.set('invoice', invoice);
    if (listDate) params.set('date', listDate);
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/purchases/completed?${params}`, { credentials: 'include' })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (cancelled) return;
          if (!response.ok) {
            setCompleted([]);
            setListNote(data.error || 'Completed purchases are not available yet');
            return;
          }
          setListNote(null);
          setCompleted(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) {
            setCompleted([]);
            setListNote('Completed purchases are not available yet');
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, listShop, listInvoice, listDate, revision]);

  useEffect(() => {
    if (view !== 'credit' || !creditShop) return undefined;
    const params = new URLSearchParams({ shop: creditShop });
    if (creditApplied.trim()) params.set('invoice', creditApplied.trim());
    let cancelled = false;
    fetch(`/api/purchases/credit?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setCreditRows([]);
          setCreditNote(data.error || 'Credit purchases are not available yet');
          return;
        }
        setCreditNote(null);
        setCreditRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setCreditRows([]);
          setCreditNote('Credit purchases are not available yet');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view, creditShop, creditApplied, revision]);

  useEffect(() => {
    if (view !== 'record' || payment !== 'transfer') return;
    document.getElementById('purchase-bank-panel')?.scrollIntoView({ block: 'center' });
  }, [view, payment]);

  const supplier = suppliers.find((item) => String(item.id) === String(supplierId)) || null;
  const product = products.find((item) => String(item.id) === String(productId)) || null;
  const supplierNeedle = supplierQuery.trim().toLowerCase();
  const productNeedle = productQuery.trim().toLowerCase();
  const supplierChoices = suppliers.filter((item) => !supplierNeedle || (supplier && supplierNeedle === item.name.toLowerCase()) || item.name.toLowerCase().includes(supplierNeedle));
  const productChoices = products.filter((item) => !productNeedle || (product && productNeedle === item.name.toLowerCase()) || item.name.toLowerCase().includes(productNeedle));
  const onHand = stock.find((item) => String(item.id) === String(productId));
  const available = onHand?.quantity ?? 0;
  const priceSource = !product
    ? ''
    : (priceMode === 'fixed'
      ? (product.unit_price == null ? '' : (Number(product.unit_price) / 100).toFixed(2))
      : price.trim());
  const unitCents = /^\d+(\.\d{1,2})?$/.test(priceSource) ? Math.round(Number(priceSource) * 100) : 0;
  const qtyNumber = Number(qty);
  const totalCents = Number.isInteger(qtyNumber) && qtyNumber > 0 ? unitCents * qtyNumber : 0;
  const paidNowCents = /^\d+(\.\d{1,2})?$/.test(paidNow.trim()) ? Math.round(Number(paidNow.trim()) * 100) : null;

  async function onRecord(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const quantity = Number(qty);
    if (!shopName || !supplier || !product) {
      setError('Choose a shop, a supplier, and a product');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be a whole number');
      return;
    }
    if (unit !== product.unit) {
      setError(`This product is bought in ${product.unit}`);
      return;
    }
    const typedPrice = priceMode === 'fixed'
      ? (product.unit_price == null ? '' : (Number(product.unit_price) / 100).toFixed(2))
      : price.trim();
    if (priceMode === 'fixed') {
      if (product.unit_price == null) {
        setError('Set a price on this product');
        return;
      }
    } else if (!/^\d+(\.\d{1,2})?$/.test(typedPrice)) {
      setError('Enter a unit price like 45.34');
      return;
    }
    const lineCents = Math.round(Number(typedPrice) * 100);
    if (payment === 'credit' && creditKind === 'partial') {
      const paidRaw = paidNow.trim();
      const paidCents = /^\d+(\.\d{1,2})?$/.test(paidRaw) ? Math.round(Number(paidRaw) * 100) : -1;
      if (paidCents <= 0 || paidCents >= lineCents * quantity) {
        setError('Paid now must be more than 0 and less than the total');
        return;
      }
    }
    if (payment === 'transfer' && !bank) {
      setError('Choose a bank');
      return;
    }
    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        shop: shopName,
        supplierId: supplier.id,
        productId: product.id,
        unit,
        quantity,
        payment,
        bankName: payment === 'transfer' ? bank : undefined,
        creditKind: payment === 'credit' ? creditKind : undefined,
        paidNow: payment === 'credit' && creditKind === 'partial' ? paidNow.trim() : undefined,
        unitPrice: typedPrice,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not record the purchase');
      return;
    }
    setQty('1');
    setBank('');
    const paidNote = data.creditKind === 'partial' ? ` Paid ${(data.paidCents / 100).toFixed(2)} now.` : '';
    const creditNoteText = data.balanceCents > 0 ? ` ${(data.balanceCents / 100).toFixed(2)} stays on credit.` : '';
    const bankNote = data.payment === 'transfer' ? ` Transfer to ${data.bankName}.` : '';
    setNotice(`Invoice ${data.invoiceNumber}. Bought ${data.quantity} ${data.unit} of ${data.name}.${bankNote}${paidNote}${creditNoteText} ${data.onHand} now in ${shopName}.`);
    setRevision((version) => version + 1);
    onChanged();
  }

  async function onPay(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!payId) {
      setError('Choose an invoice');
      return;
    }
    if (payMethod === 'transfer' && !payBank) {
      setError('Choose a bank');
      return;
    }
    const response = await fetch('/api/purchases/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        purchaseId: payId,
        amount: payAmount.trim(),
        payment: payMethod,
        bankName: payMethod === 'transfer' ? payBank : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not record the payment');
      return;
    }
    const bankNote = data.payment === 'transfer' ? ` by transfer to ${data.bankName}` : ' in cash';
    const leftNote = data.balanceCents > 0
      ? ` ${(data.balanceCents / 100).toFixed(2)} stays on credit.`
      : ' Nothing stays on credit.';
    setNotice(`Invoice ${data.invoiceNumber}. Paid ${(data.paidCents / 100).toFixed(2)}${bankNote}.${leftNote}`);
    setPayAmount('');
    setPayBank('');
    setRevision((version) => version + 1);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Purchases</h1>
      <p className="mt-1 text-sm text-slate-500">Buy into one shop, look up a completed purchase, or pay a supplier on a credit invoice.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 text-sm text-teal-800">{notice}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className={`rounded px-3 py-2 text-sm ${view === 'record' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setView('record')}>Record purchase</button>
        <button type="button" className={`rounded px-3 py-2 text-sm ${view === 'list' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setView('list')}>Completed purchases</button>
        <button type="button" className={`rounded px-3 py-2 text-sm ${view === 'credit' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setView('credit')}>Purchases by credit</button>
      </div>
      {view === 'record' && (
        <form onSubmit={onRecord} className="mt-4 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Invoice number</p>
            <p className="text-4xl font-semibold tracking-tight">{nextInvoice ?? '…'}</p>
            <p className="text-sm text-slate-300">{shopName}</p>
          </div>
          <label className="block text-sm text-slate-600">
            Shop
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={shopName} onChange={(event) => setShopName(event.target.value)}>
              {shops.map((shop) => (
                <option key={shop.name} value={shop.name}>{shop.name}</option>
              ))}
            </select>
          </label>
          <div>
            <div className="flex border-b border-slate-300" role="tablist" aria-label="Payment">
              <button type="button" role="tab" aria-selected={payment === 'cash'} className={`rounded-t px-4 py-2 text-sm ${payment === 'cash' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setPayment('cash')}>Cash</button>
              <button type="button" role="tab" aria-selected={payment === 'transfer'} className={`rounded-t px-4 py-2 text-sm ${payment === 'transfer' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setPayment('transfer')}>Transfer</button>
              <button type="button" role="tab" aria-selected={payment === 'credit'} className={`rounded-t px-4 py-2 text-sm ${payment === 'credit' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setPayment('credit')}>Credit</button>
            </div>
            {payment === 'transfer' && (
              <BankField id="purchase-bank-panel" banks={banks} value={bank} onChange={setBank} />
            )}
            {payment === 'credit' && (
              <div role="tabpanel" aria-label="Credit" className="rounded-b border border-t-0 border-slate-300 p-4 text-sm text-slate-600">
                <div className="flex gap-2">
                  <button type="button" className={`rounded px-3 py-2 ${creditKind === 'full' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setCreditKind('full')}>Full</button>
                  <button type="button" className={`rounded px-3 py-2 ${creditKind === 'partial' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setCreditKind('partial')}>Partial</button>
                </div>
                {creditKind === 'full' && <p className="mt-2 text-xs text-slate-500">The whole {(totalCents / 100).toFixed(2)} stays on credit.</p>}
                {creditKind === 'partial' && (
                  <label className="mt-3 block">
                    Paid now
                    <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={paidNow} onChange={(event) => setPaidNow(event.target.value)} placeholder="10.00" />
                    {paidNowCents != null && paidNowCents > 0 && paidNowCents < totalCents && (
                      <span className="mt-1 block text-xs text-slate-500">{((totalCents - paidNowCents) / 100).toFixed(2)} stays on credit.</span>
                    )}
                  </label>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm text-slate-600" htmlFor="purchase-supplier">Supplier</label>
            <div className="mt-1 flex">
              <input
                id="purchase-supplier"
                className="w-full rounded-l border border-slate-300 px-3 py-2"
                value={supplierQuery}
                placeholder="Search or choose a supplier"
                onChange={(event) => {
                  setSupplierQuery(event.target.value);
                  setSupplierId('');
                  setSupplierOpen(true);
                }}
                onFocus={() => setSupplierOpen(true)}
              />
              <button type="button" className="rounded-r border border-l-0 border-slate-300 px-3" aria-label="Open supplier list" onClick={() => setSupplierOpen((open) => !open)}>▾</button>
            </div>
            {supplierOpen && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                {supplierChoices.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSupplierId(String(item.id));
                        setSupplierQuery(item.name);
                        setSupplierOpen(false);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
                {supplierChoices.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No supplier with that name</li>}
              </ul>
            )}
          </div>
          <label className="block text-sm text-slate-600">
            TIN
            <input className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2" value={supplier?.tin || ''} readOnly placeholder="Filled from the supplier" />
          </label>
          <label className="block text-sm text-slate-600">
            Organization name
            <input className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2" value={supplier?.name || ''} readOnly />
          </label>
          <div className="relative">
            <label className="block text-sm text-slate-600" htmlFor="purchase-product">Product</label>
            <div className="mt-1 flex">
              <input
                id="purchase-product"
                className="w-full rounded-l border border-slate-300 px-3 py-2"
                value={productQuery}
                placeholder="Search or choose a product"
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  setProductId('');
                  setPrice('');
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
                        setPrice(item.unit_price == null ? '' : (item.unit_price / 100).toFixed(2));
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
            {product && unit !== product.unit && <span className="mt-1 block text-xs text-red-700">This product is bought in {product.unit}.</span>}
          </label>
          <label className="block text-sm text-slate-600">
            Unit price
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:bg-slate-50"
              value={product ? priceSource : ''}
              onChange={(event) => setPrice(event.target.value)}
              disabled={!product || priceMode === 'fixed'}
              placeholder="45.34"
            />
            {product && priceMode === 'fixed' && product.unit_price == null && <span className="mt-1 block text-xs text-slate-500">Set a price on this product before you buy it.</span>}
            {product && priceMode === 'fixed' && product.unit_price != null && <span className="mt-1 block text-xs text-slate-500">This price is set on the product.</span>}
            {product && priceMode === 'dynamic' && product.unit_price == null && <span className="mt-1 block text-xs text-slate-500">This product has no price. Type the price for this purchase.</span>}
            {product && priceMode === 'dynamic' && product.unit_price != null && <span className="mt-1 block text-xs text-slate-500">Filled from the product. Change it for this purchase if you need a different price.</span>}
          </label>
          <label className="block text-sm text-slate-600">
            Quantity
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={qty} onChange={(event) => setQty(event.target.value)} inputMode="numeric" />
            {product && <span className="mt-1 block text-xs text-slate-500">{available} {product.unit} in {shopName}</span>}
          </label>
          <p className="text-sm text-slate-700">Total {(totalCents / 100).toFixed(2)}</p>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Record purchase</button>
        </form>
      )}
      {view === 'credit' && (
        <div className="mt-4 max-w-lg space-y-3">
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              setCreditApplied(creditInvoice.trim());
              setPayId(null);
            }}
          >
            <label className="block text-sm text-slate-600">
              Shop
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={creditShop}
                onChange={(event) => {
                  setCreditShop(event.target.value);
                  setCreditApplied('');
                  setCreditInvoice('');
                  setPayId(null);
                }}
              >
                {shops.map((shop) => (
                  <option key={shop.name} value={shop.name}>{shop.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              Invoice number
              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={creditInvoice} onChange={(event) => setCreditInvoice(event.target.value)} placeholder="1" inputMode="numeric" />
            </label>
            <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Search</button>
          </form>
          {creditNote && <p className="text-sm text-red-700">{creditNote}</p>}
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {creditRows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoice number</p>
                <p className="text-3xl font-semibold text-slate-900">{row.invoiceNumber}</p>
                <p className="text-sm text-slate-500">{row.shop} · {row.supplier}</p>
                <p className="text-sm text-slate-500">{row.createdBy ? `Recorded by ${row.createdBy}` : 'Person was not saved'}</p>
                <p className="text-sm text-slate-500">{row.quantity} {row.unit} of {row.product}</p>
                <p className="text-sm text-slate-700">Total {money(row.totalCents)} · Paid {money(row.paidCents)} · Left {money(row.balanceCents)}</p>
                {row.payments?.length > 0 && (
                  <ul className="mt-1 text-xs text-slate-500">
                    {row.payments.map((item, index) => (
                      <li key={`${row.id}-${index}`}>
                        {money(item.amountCents)} {item.payment === 'transfer' ? `transfer to ${item.bankName}` : 'cash'}
                      </li>
                    ))}
                  </ul>
                )}
                {row.balanceCents > 0 && payId !== row.id && (
                  <button type="button" className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => { setPayId(row.id); setPayAmount(''); setPayMethod('cash'); setPayBank(''); }}>Take payment</button>
                )}
                {row.balanceCents > 0 && payId === row.id && (
                  <form onSubmit={onPay} className="mt-3 space-y-2">
                    <label className="block text-sm text-slate-600">
                      Amount
                      <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder="10.00" />
                    </label>
                    <div className="flex border-b border-slate-300" role="tablist" aria-label="Payment">
                      <button type="button" role="tab" aria-selected={payMethod === 'cash'} className={`rounded-t px-4 py-2 text-sm ${payMethod === 'cash' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setPayMethod('cash')}>Cash</button>
                      <button type="button" role="tab" aria-selected={payMethod === 'transfer'} className={`rounded-t px-4 py-2 text-sm ${payMethod === 'transfer' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setPayMethod('transfer')}>Transfer</button>
                    </div>
                    {payMethod === 'transfer' && (
                      <BankField banks={banks} value={payBank} onChange={setPayBank} />
                    )}
                    <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Record payment</button>
                  </form>
                )}
              </li>
            ))}
            {creditRows.length === 0 && !creditNote && <li className="px-4 py-3 text-sm text-slate-500">No credit invoice for this shop.</li>}
          </ul>
        </div>
      )}
      {view === 'list' && (
        <div className="mt-4 max-w-3xl space-y-3">
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm text-slate-600">
              Invoice number
              <input className="mt-1 block w-36 rounded border border-slate-300 px-3 py-2" value={listInvoice} onChange={(event) => setListInvoice(event.target.value)} placeholder="2" inputMode="numeric" />
            </label>
            <label className="text-sm text-slate-600">
              Shop
              <select className="mt-1 block rounded border border-slate-300 px-3 py-2" value={listShop} onChange={(event) => setListShop(event.target.value)}>
                <option value="all">All shops</option>
                {shops.map((shop) => (
                  <option key={shop.name} value={shop.name}>{shop.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Date
              <input type="date" className="mt-1 block rounded border border-slate-300 px-3 py-2" value={listDate} onChange={(event) => setListDate(event.target.value)} />
            </label>
            {listDate && (
              <button type="button" className="mt-6 h-fit rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setListDate('')}>Any date</button>
            )}
          </div>
          {listNote && <p className="text-sm text-red-700">{listNote}</p>}
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {completed.map((purchase) => {
              const when = new Date(purchase.boughtAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
              const paymentLabel = purchase.payment === 'transfer'
                ? `Transfer to ${purchase.bankName}`
                : purchase.payment === 'credit'
                  ? 'Credit'
                  : 'Cash';
              return (
                <li key={purchase.id} className="px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoice number</p>
                  <p className="text-3xl font-semibold text-slate-900">{purchase.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">{when} · {purchase.shop}</p>
                  <p className="text-sm text-slate-700">{purchase.supplier}</p>
                  <p className="text-sm text-slate-500">{purchase.createdBy ? `Recorded by ${purchase.createdBy}` : 'Person was not saved'}</p>
                  <p className="text-sm text-slate-500">{purchase.quantity} {purchase.unit} of {purchase.product}</p>
                  <p className="text-sm text-slate-700">{paymentLabel} · Total {money(purchase.totalCents)} · Paid {money(purchase.paidCents)}{purchase.balanceCents > 0 ? ` · Left ${money(purchase.balanceCents)}` : ''}</p>
                </li>
              );
            })}
            {!listNote && completed.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No completed purchases match these filters.</li>}
          </ul>
        </div>
      )}
    </>
  );
}
