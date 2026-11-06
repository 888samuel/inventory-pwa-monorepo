'use client';

import { useEffect, useState } from 'react';
import { ExcelImport } from './excel-import';
import { PurchaseScreen } from './purchase';
import { TransferScreen } from './transfer';
import { StaffScreen } from './staff';

export default function HomePage() {
  const [mode, setMode] = useState('login');
  const [loginId, setLoginId] = useState('lina@harbor.test');
  const [password, setPassword] = useState('harbor-pass');
  const [ownerName, setOwnerName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [user, setUser] = useState(null);
  const [shops, setShops] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [products, setProducts] = useState([]);
  const [sku, setSku] = useState('');
  const [productName, setProductName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [units, setUnits] = useState([]);
  const [productUnit, setProductUnit] = useState('pcs');
  const [stock, setStock] = useState([]);
  const [stockShop, setStockShop] = useState('all');
  const [stockNote, setStockNote] = useState(null);
  const [saleShopName, setSaleShopName] = useState('');
  const [saleStock, setSaleStock] = useState([]);
  const [saleCustomerQuery, setSaleCustomerQuery] = useState('');
  const [saleCustomerId, setSaleCustomerId] = useState('');
  const [saleProductQuery, setSaleProductQuery] = useState('');
  const [saleProductId, setSaleProductId] = useState('');
  const [saleUnit, setSaleUnit] = useState('pcs');
  const [salePrice, setSalePrice] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [salePayment, setSalePayment] = useState('cash');
  const [saleCreditKind, setSaleCreditKind] = useState('full');
  const [salePaidNow, setSalePaidNow] = useState('');
  const [saleBank, setSaleBank] = useState('');
  const [nextInvoice, setNextInvoice] = useState(null);
  const [saleView, setSaleView] = useState('record');
  const [creditShop, setCreditShop] = useState('');
  const [creditInvoice, setCreditInvoice] = useState('');
  const [creditApplied, setCreditApplied] = useState('');
  const [creditSales, setCreditSales] = useState([]);
  const [creditNote, setCreditNote] = useState(null);
  const [creditPayId, setCreditPayId] = useState(null);
  const [creditPayAmount, setCreditPayAmount] = useState('');
  const [creditPayMethod, setCreditPayMethod] = useState('cash');
  const [creditPayBank, setCreditPayBank] = useState('');
  const [saleCustomerOpen, setSaleCustomerOpen] = useState(false);
  const [saleProductOpen, setSaleProductOpen] = useState(false);
  const [saleNotice, setSaleNotice] = useState(null);
  const [salesRevision, setSalesRevision] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [customerTin, setCustomerTin] = useState('');
  const [customerOrgName, setCustomerOrgName] = useState('');
  const [customersNote, setCustomersNote] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierOrgName, setSupplierOrgName] = useState('');
  const [suppliersNote, setSuppliersNote] = useState(null);
  const [error, setError] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [salesShop, setSalesShop] = useState('all');
  const [salesWhen, setSalesWhen] = useState('today');
  const [customDate, setCustomDate] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  });
  const [sales, setSales] = useState({ units: 0, cents: 0, bars: [] });
  const [salesNote, setSalesNote] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function loadShops() {
    const response = await fetch('/api/branches', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load shops');
    const list = Array.isArray(data) ? data : [];
    setShops(list);
    setSaleShopName((current) => (list.some((shop) => shop.name === current) ? current : (list[0]?.name || '')));
    setCreditShop((current) => (list.some((shop) => shop.name === current) ? current : (list[0]?.name || '')));
    setStockShop((current) => (current === 'all' || list.some((shop) => shop.name === current) ? current : 'all'));
    setSalesShop((current) => (current === 'all' || list.some((shop) => shop.name === current) ? current : 'all'));
  }

  async function loadProducts() {
    const response = await fetch('/api/products', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load products');
    setProducts(data);
  }

  async function loadCustomers() {
    const response = await fetch('/api/customers', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
      setCustomers([]);
      setCustomersNote('Customers are not connected yet.');
      return;
    }
    if (!response.ok) throw new Error(data.error || 'Could not load customers');
    setCustomersNote(null);
    setCustomers(Array.isArray(data) ? data : []);
  }

  async function loadSuppliers() {
    const response = await fetch('/api/suppliers', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
      setSuppliers([]);
      setSuppliersNote('Suppliers are not connected yet.');
      return;
    }
    if (!response.ok) throw new Error(data.error || 'Could not load suppliers');
    setSuppliersNote(null);
    setSuppliers(Array.isArray(data) ? data : []);
  }

  async function loadUnits() {
    const response = await fetch('/api/units', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setUnits([]);
      return;
    }
    setUnits(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!user) return undefined;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = salesWhen === 'today' ? `${now.getFullYear()}-${month}-${day}` : customDate;
    if (!date) return undefined;
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const params = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() });
    if (salesShop !== 'all') params.set('shop', salesShop);
    let cancelled = false;
    fetch(`/api/sales?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setSales({ units: 0, cents: 0, bars: [] });
          setSalesNote(response.status === 404 ? 'Sales report is not connected yet.' : (data.error || 'Sales report is not available yet'));
          return;
        }
        setSalesNote(null);
        setSales({
          units: data.units ?? 0,
          cents: data.cents ?? 0,
          bars: Array.isArray(data.bars) ? data.bars : [],
        });
      })
      .catch(() => {
        if (!cancelled) setSalesNote('Sales report is not available yet');
      });
    return () => {
      cancelled = true;
    };
  }, [user, salesShop, salesWhen, customDate, salesRevision]);

  useEffect(() => {
    if (!user) return undefined;
    const params = new URLSearchParams();
    if (stockShop !== 'all') params.set('shop', stockShop);
    let cancelled = false;
    fetch(`/api/inventory?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setStock([]);
          setStockNote(response.status === 404 ? 'Inventory is not connected yet.' : (data.error || 'Could not load inventory'));
          return;
        }
        setStockNote(null);
        setStock(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStockNote('Inventory is not connected yet.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, stockShop, salesRevision]);

  useEffect(() => {
    if (!user || !saleShopName) return undefined;
    const params = new URLSearchParams({ shop: saleShopName });
    let cancelled = false;
    fetch(`/api/inventory?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!cancelled) setSaleStock(response.ok && Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSaleStock([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, saleShopName, salesRevision]);

  useEffect(() => {
    if (!user || !saleShopName) return undefined;
    const params = new URLSearchParams({ shop: saleShopName });
    let cancelled = false;
    fetch(`/api/sales/next?${params}`, { credentials: 'include' })
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
  }, [user, saleShopName, salesRevision]);

  useEffect(() => {
    if (!user || saleView !== 'credit' || !creditShop) return undefined;
    const params = new URLSearchParams({ shop: creditShop });
    if (creditApplied.trim()) params.set('invoice', creditApplied.trim());
    let cancelled = false;
    fetch(`/api/sales/credit?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setCreditSales([]);
          setCreditNote(data.error || 'Credit sales are not available yet');
          return;
        }
        setCreditNote(null);
        setCreditSales(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setCreditSales([]);
          setCreditNote('Credit sales are not available yet');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, saleView, creditShop, creditApplied, salesRevision]);

  useEffect(() => {
    if (section !== 'sales' || saleView !== 'record' || salePayment !== 'transfer') return;
    document.getElementById('sale-bank-panel')?.scrollIntoView({ block: 'center' });
  }, [section, saleView, salePayment]);

  async function signIn(identifier, secret) {
    const login = identifier.trim();
    const body = { login, password: secret };
    if (login.includes('@')) body.email = login;
    let response;
    try {
      response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } catch {
      setError('The server is not running. Start the database, then the app.');
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'The server is not running. Start the database, then the app.');
      return;
    }
    setShops([]);
    setProducts([]);
    setCustomers([]);
    setSuppliers([]);
    setSaleShopName('');
    setCreditShop('');
    setStockShop('all');
    setSalesShop('all');
    setUser(data.user);
    try {
      await loadShops();
      await loadProducts();
      await loadCustomers();
      await loadSuppliers();
      await loadUnits();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onLogin(event) {
    event.preventDefault();
    setError(null);
    if (!loginId.trim() || !password) {
      setError('Email or phone, and a password, are required');
      return;
    }
    await signIn(loginId, password);
  }

  async function onSignup(event) {
    event.preventDefault();
    setError(null);
    const name = ownerName.trim();
    const organization = organizationName.trim();
    const email = signupEmail.trim();
    const normalizedPhone = phone.trim().replace(/[\s-]/g, '');
    if (!name || !organization || !email || !signupPassword) {
      setError('Name, company, email, and password are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Email must include @');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (normalizedPhone && !/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      setError('Phone must be 8 to 15 digits');
      return;
    }

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name,
        email,
        password: signupPassword,
        organizationName: organization,
        phone: normalizedPhone || null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not create the company');
      return;
    }
    await signIn(email, signupPassword);
  }

  async function onAddShop(event) {
    event.preventDefault();
    setError(null);
    const response = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, location }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not add shop');
      return;
    }
    setName('');
    setLocation('');
    await loadShops();
  }

  async function onAddProduct(event) {
    event.preventDefault();
    setError(null);
    const price = unitPrice.trim();
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sku,
        name: productName,
        unit: productUnit,
        unit_price: price === '' ? null : price,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not add product');
      return;
    }
    setSku('');
    setProductName('');
    setUnitPrice('');
    await loadProducts();
  }

  async function onAddCustomer(event) {
    event.preventDefault();
    setError(null);
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tin: customerTin, name: customerOrgName }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not add customer');
      return;
    }
    setCustomerTin('');
    setCustomerOrgName('');
    await loadCustomers();
  }

  async function onAddSupplier(event) {
    event.preventDefault();
    setError(null);
    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tin: supplierTin, name: supplierOrgName }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not add supplier');
      return;
    }
    setSupplierTin('');
    setSupplierOrgName('');
    await loadSuppliers();
  }

  async function onRecordSale(event) {
    event.preventDefault();
    setError(null);
    setSaleNotice(null);
    const quantity = Number(saleQty);
    const product = products.find((item) => String(item.id) === String(saleProductId));
    const customer = customers.find((item) => String(item.id) === String(saleCustomerId));
    const onHand = saleStock.find((item) => String(item.id) === String(saleProductId));
    const available = onHand?.quantity ?? 0;
    if (!saleShopName || !customer || !product) {
      setError('Choose a shop, a customer, and a product');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be a whole number');
      return;
    }
    if (saleUnit !== product.unit) {
      setError(`This product is sold in ${product.unit}`);
      return;
    }
    if (salePayment === 'credit' && customer.is_walking) {
      setError('A walking customer cannot buy on credit');
      return;
    }
    const typedPrice = salePrice.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(typedPrice)) {
      setError('Enter a unit price like 45.34');
      return;
    }
    const unitCents = Math.round(Number(typedPrice) * 100);
    const totalCents = unitCents * quantity;
    if (salePayment === 'credit' && saleCreditKind === 'partial') {
      const paidRaw = salePaidNow.trim();
      const paidCents = /^\d+(\.\d{1,2})?$/.test(paidRaw) ? Math.round(Number(paidRaw) * 100) : -1;
      if (paidCents <= 0 || paidCents >= totalCents) {
        setError('Paid now must be more than 0 and less than the total');
        return;
      }
    }
    if (salePayment === 'transfer' && !saleBank.trim()) {
      setError('Type the bank name');
      return;
    }
    if (quantity > available) {
      setError(`Only ${available} left in this shop`);
      return;
    }
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        shop: saleShopName,
        customerId: customer.id,
        productId: product.id,
        unit: saleUnit,
        quantity,
        payment: salePayment,
        bankName: salePayment === 'transfer' ? saleBank.trim() : undefined,
        creditKind: salePayment === 'credit' ? saleCreditKind : undefined,
        paidNow: salePayment === 'credit' && saleCreditKind === 'partial' ? salePaidNow.trim() : undefined,
        unitPrice: typedPrice,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not record the sale');
      return;
    }
    setSaleQty('1');
    setSaleBank('');
    const paidNote = data.creditKind === 'partial' ? ` Paid ${(data.paidCents / 100).toFixed(2)} now.` : '';
    const creditNote = data.balanceCents > 0 ? ` ${(data.balanceCents / 100).toFixed(2)} stays on credit.` : '';
    const bankNote = data.payment === 'transfer' ? ` Transfer to ${data.bankName}.` : '';
    setSaleNotice(`Invoice ${data.invoiceNumber}. Sold ${data.quantity} ${data.unit} of ${data.name}.${bankNote}${paidNote}${creditNote} ${data.onHand} left in ${saleShopName}.`);
    setSalesRevision((version) => version + 1);
  }

  async function onPayCredit(event) {
    event.preventDefault();
    setError(null);
    setSaleNotice(null);
    if (!creditPayId) {
      setError('Choose an invoice');
      return;
    }
    if (creditPayMethod === 'transfer' && !creditPayBank.trim()) {
      setError('Type the bank name');
      return;
    }
    const response = await fetch('/api/sales/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        saleId: creditPayId,
        amount: creditPayAmount.trim(),
        payment: creditPayMethod,
        bankName: creditPayMethod === 'transfer' ? creditPayBank.trim() : undefined,
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
    setSaleNotice(`Invoice ${data.invoiceNumber}. Paid ${(data.paidCents / 100).toFixed(2)}${bankNote}.${leftNote}`);
    setCreditPayAmount('');
    setCreditPayBank('');
    setSalesRevision((version) => version + 1);
  }

  async function onLogout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setShops([]);
    setProducts([]);
    setCustomers([]);
    setSuppliers([]);
    setSaleShopName('');
    setCreditShop('');
    setStockShop('all');
    setSalesShop('all');
    setSection('dashboard');
    setError(null);
  }

  if (user) {
    const nav = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'shops', label: 'Shops' },
      { id: 'products', label: 'Products' },
      { id: 'inventory', label: 'Inventory' },
      { id: 'sales', label: 'Sales' },
      { id: 'purchases', label: 'Purchases' },
      { id: 'transfers', label: 'Transfer' },
      { id: 'customers', label: 'Customers' },
      { id: 'suppliers', label: 'Suppliers' },
      { id: 'users', label: 'Users' },
    ];
    const money = (cents) => (Number(cents) / 100).toFixed(2);
    const tallest = sales.bars.reduce((max, bar) => Math.max(max, Number(bar.cents) || 0), 0);
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const unitChoices = units.length > 0 ? units : [
      { code: 'pcs', name: 'Piece' },
      { code: 'carton', name: 'Carton' },
      { code: 'dozen', name: 'Dozen' },
      { code: 'kg', name: 'Kilogram' },
      { code: 'litre', name: 'Litre' },
      { code: 'metre', name: 'Metre' },
    ];
    const saleCustomer = customers.find((customer) => String(customer.id) === String(saleCustomerId)) || null;
    const saleProduct = products.find((product) => String(product.id) === String(saleProductId)) || null;
    const customerNeedle = saleCustomerQuery.trim().toLowerCase();
    const productNeedle = saleProductQuery.trim().toLowerCase();
    const customerChoices = customers.filter((customer) => !customerNeedle || (saleCustomer && customerNeedle === saleCustomer.name.toLowerCase()) || customer.name.toLowerCase().includes(customerNeedle));
    const productChoices = products.filter((product) => !productNeedle || (saleProduct && productNeedle === saleProduct.name.toLowerCase()) || product.name.toLowerCase().includes(productNeedle));
    const saleOnHand = saleStock.find((item) => String(item.id) === String(saleProductId));
    const saleAvailable = saleOnHand?.quantity ?? 0;
    const unitCents = !saleProduct
      ? 0
      : (/^\d+(\.\d{1,2})?$/.test(salePrice.trim()) ? Math.round(Number(salePrice.trim()) * 100) : 0);
    const qtyNumber = Number(saleQty);
    const totalCents = Number.isInteger(qtyNumber) && qtyNumber > 0 ? unitCents * qtyNumber : 0;
    const saleTotal = totalCents / 100;
    const paidNowCents = /^\d+(\.\d{1,2})?$/.test(salePaidNow.trim()) ? Math.round(Number(salePaidNow.trim()) * 100) : null;

    return (
      <div className="flex min-h-screen">
        <aside className="flex w-60 shrink-0 flex-col bg-slate-900 px-4 py-6 text-white">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Inventory</p>
          <p className="mt-2 text-lg font-semibold">{user.name}</p>
          <button
            type="button"
            className="mt-4 rounded border border-slate-500 px-3 py-2 text-left text-sm text-white"
            onClick={onLogout}
          >
            Log out
          </button>
          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded px-3 py-2 text-left text-sm ${section === item.id ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-slate-800'}`}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-8 py-8">
          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
          {section === 'dashboard' && (
            <div className="max-w-3xl">
              <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
                <div className="px-6 py-6">
                  <p className="text-xs tracking-wide text-slate-400 uppercase">{today}</p>
                  <h1 className="mt-2 text-2xl font-semibold">{user.name}</h1>
                  <p className="mt-1 text-sm text-slate-300">Sales for the shop and day you choose.</p>
                </div>
                <div className="grid grid-cols-2 border-t border-slate-700">
                  <button type="button" className="px-6 py-4 text-left hover:bg-slate-800" onClick={() => setSection('shops')}>
                    <p className="text-xs text-slate-400">Shops</p>
                    <p className="mt-1 text-2xl font-semibold">{shops.length}</p>
                  </button>
                  <div className="border-l border-slate-700 px-6 py-4">
                    <p className="text-xs text-slate-400">Sales</p>
                    <p className="mt-1 text-2xl font-semibold">{money(sales.cents)}</p>
                    <p className="text-xs text-slate-400">{sales.units} sold</p>
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Sales</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {salesWhen === 'today' ? 'Today' : customDate} · {salesShop === 'all' ? 'All shops' : salesShop}
                    </p>
                  </div>
                  <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setFiltersOpen((open) => !open)}>
                    {filtersOpen ? 'Hide filters' : 'Filter'}
                  </button>
                </div>
                {filtersOpen && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={salesShop} onChange={(event) => setSalesShop(event.target.value)}>
                      <option value="all">All shops</option>
                      {shops.map((shop) => (
                        <option key={shop.name} value={shop.name}>{shop.name}</option>
                      ))}
                    </select>
                    <button type="button" className={`rounded px-3 py-2 text-sm ${salesWhen === 'today' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setSalesWhen('today')}>Today</button>
                    <button type="button" className={`rounded px-3 py-2 text-sm ${salesWhen === 'custom' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setSalesWhen('custom')}>Custom date</button>
                    {salesWhen === 'custom' && (
                      <input type="date" className="rounded border border-slate-300 px-3 py-2 text-sm" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
                    )}
                  </div>
                )}
                {salesNote && <p className="mt-4 text-sm text-red-700">{salesNote}</p>}
                <ul className="mt-6 space-y-4">
                  {sales.bars.map((bar) => (
                    <li key={bar.label}>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <p className="font-medium text-slate-900">{bar.label}</p>
                        <p className="text-slate-600">{money(bar.cents)} · {bar.units} sold</p>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-700 to-slate-900"
                          style={{ width: `${tallest ? Math.max(8, (Number(bar.cents) / tallest) * 100) : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                  {!salesNote && sales.bars.length === 0 && <li className="text-sm text-slate-500">No sales on this day.</li>}
                </ul>
              </section>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Where you sell</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {shops.map((shop) => (
                    <li key={shop.name} className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="font-medium text-slate-900">{shop.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{shop.location}</p>
                    </li>
                  ))}
                  {shops.length === 0 && <li className="text-sm text-slate-500">No shops yet.</li>}
                </ul>
              </section>
            </div>
          )}
          {section === 'shops' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Shops</h1>
              <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {shops.map((shop) => (
                  <li key={shop.name} className="px-4 py-3">
                    <p className="font-medium text-slate-900">{shop.name}</p>
                    <p className="text-sm text-slate-500">{shop.location}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={onAddShop} className="mt-6 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm text-slate-600">
                  Shop name
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="block text-sm text-slate-600">
                  Address
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={location} onChange={(event) => setLocation(event.target.value)} />
                </label>
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Add shop</button>
              </form>
              <ExcelImport kind="shops" onSaved={loadShops} />
            </>
          )}
          {section === 'products' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
              <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {products.map((product) => (
                  <li key={product.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">{product.sku}{product.unit ? ` · ${product.unit}` : ''}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{product.unit_price == null ? 'No price' : (product.unit_price / 100).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={onAddProduct} className="mt-6 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm text-slate-600">
                  SKU
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={sku} onChange={(event) => setSku(event.target.value)} />
                  <span className="mt-1 block text-xs text-slate-500">A short code you choose for this product, like HBR-001.</span>
                </label>
                <label className="block text-sm text-slate-600">
                  Product name
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={productName} onChange={(event) => setProductName(event.target.value)} />
                </label>
                <label className="block text-sm text-slate-600">
                  Unit
                  <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={productUnit} onChange={(event) => setProductUnit(event.target.value)}>
                    {unitChoices.map((unit) => (
                      <option key={unit.code} value={unit.code}>{unit.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  Price <span className="text-slate-400">optional</span>
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="45.34" />
                </label>
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Add product</button>
              </form>
              <ExcelImport kind="products" onSaved={loadProducts} />
            </>
          )}
          {section === 'inventory' && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
                  <p className="mt-1 text-sm text-slate-500">{stockShop === 'all' ? 'All shops' : stockShop}</p>
                </div>
                <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={stockShop} onChange={(event) => setStockShop(event.target.value)}>
                  <option value="all">All shops</option>
                  {shops.map((shop) => (
                    <option key={shop.name} value={shop.name}>{shop.name}</option>
                  ))}
                </select>
              </div>
              {stockNote && <p className="mt-4 text-sm text-red-700">{stockNote}</p>}
              <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {stock.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.sku}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{item.quantity} {item.unit}</p>
                  </li>
                ))}
                {stock.length === 0 && !stockNote && <li className="px-4 py-3 text-sm text-slate-500">No products yet.</li>}
              </ul>
              <ExcelImport kind="stock" onSaved={() => setSalesRevision((version) => version + 1)} />
            </>
          )}
          {section === 'sales' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Sales</h1>
              <p className="mt-1 text-sm text-slate-500">Sell from one shop, or take a payment on a credit invoice.</p>
              {saleNotice && <p className="mt-4 text-sm text-teal-800">{saleNotice}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className={`rounded px-3 py-2 text-sm ${saleView === 'record' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setSaleView('record')}>Record sale</button>
                <button type="button" className={`rounded px-3 py-2 text-sm ${saleView === 'credit' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setSaleView('credit')}>Sales by credit</button>
              </div>
              {saleView === 'record' && (
              <form onSubmit={onRecordSale} className="mt-4 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-white">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-300">Invoice number</p>
                  <p className="text-4xl font-semibold tracking-tight">{nextInvoice ?? '…'}</p>
                  <p className="text-sm text-slate-300">{saleShopName}</p>
                </div>
                <label className="block text-sm text-slate-600">
                  Shop
                  <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={saleShopName} onChange={(event) => setSaleShopName(event.target.value)}>
                    {shops.map((shop) => (
                      <option key={shop.name} value={shop.name}>{shop.name}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <div className="flex border-b border-slate-300" role="tablist" aria-label="Payment">
                    <button type="button" role="tab" aria-selected={salePayment === 'cash'} className={`rounded-t px-4 py-2 text-sm ${salePayment === 'cash' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setSalePayment('cash')}>Cash</button>
                    <button type="button" role="tab" aria-selected={salePayment === 'transfer'} className={`rounded-t px-4 py-2 text-sm ${salePayment === 'transfer' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setSalePayment('transfer')}>Transfer</button>
                    <button type="button" role="tab" aria-selected={salePayment === 'credit'} className={`rounded-t px-4 py-2 text-sm ${salePayment === 'credit' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setSalePayment('credit')}>Credit</button>
                  </div>
                  {salePayment === 'transfer' && (
                    <div id="sale-bank-panel" role="tabpanel" aria-label="Bank" className="rounded-b border border-t-0 border-slate-300 p-4">
                      <p className="text-sm font-medium text-slate-900">Bank</p>
                      <label className="mt-3 block text-sm text-slate-600">
                        Bank name
                        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={saleBank} onChange={(event) => setSaleBank(event.target.value)} placeholder="Type the bank name" />
                      </label>
                    </div>
                  )}
                  {salePayment === 'credit' && (
                    <div role="tabpanel" aria-label="Credit" className="rounded-b border border-t-0 border-slate-300 p-4 text-sm text-slate-600">
                      <div className="flex gap-2">
                        <button type="button" className={`rounded px-3 py-2 ${saleCreditKind === 'full' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setSaleCreditKind('full')}>Full</button>
                        <button type="button" className={`rounded px-3 py-2 ${saleCreditKind === 'partial' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => setSaleCreditKind('partial')}>Partial</button>
                      </div>
                      {saleCreditKind === 'full' && <p className="mt-2 text-xs text-slate-500">The whole {saleTotal.toFixed(2)} stays on credit.</p>}
                      {saleCreditKind === 'partial' && (
                        <label className="mt-3 block">
                          Paid now
                          <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={salePaidNow} onChange={(event) => setSalePaidNow(event.target.value)} placeholder="10.00" />
                          {paidNowCents != null && paidNowCents > 0 && paidNowCents < totalCents && (
                            <span className="mt-1 block text-xs text-slate-500">{((totalCents - paidNowCents) / 100).toFixed(2)} stays on credit.</span>
                          )}
                        </label>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm text-slate-600" htmlFor="sale-customer">Customer</label>
                  <div className="mt-1 flex">
                    <input
                      id="sale-customer"
                      className="w-full rounded-l border border-slate-300 px-3 py-2"
                      value={saleCustomerQuery}
                      placeholder="Search or choose a customer"
                      onChange={(event) => {
                        setSaleCustomerQuery(event.target.value);
                        setSaleCustomerId('');
                        setSaleCustomerOpen(true);
                      }}
                      onFocus={() => setSaleCustomerOpen(true)}
                    />
                    <button type="button" className="rounded-r border border-l-0 border-slate-300 px-3" aria-label="Open customer list" onClick={() => setSaleCustomerOpen((open) => !open)}>▾</button>
                  </div>
                  {saleCustomerOpen && (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                      {customerChoices.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSaleCustomerId(String(customer.id));
                              setSaleCustomerQuery(customer.name);
                              setSaleCustomerOpen(false);
                            }}
                          >
                            {customer.name}
                          </button>
                        </li>
                      ))}
                      {customerChoices.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No customer with that name</li>}
                    </ul>
                  )}
                </div>
                <label className="block text-sm text-slate-600">
                  TIN
                  <input className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2" value={saleCustomer ? (saleCustomer.tin || '') : ''} readOnly placeholder="Filled from the customer" />
                  {saleCustomer?.is_walking && <span className="mt-1 block text-xs text-slate-500">Walking customer has no TIN and cannot buy on credit.</span>}
                </label>
                <label className="block text-sm text-slate-600">
                  Organization name
                  <input className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2" value={saleCustomer?.name || ''} readOnly />
                </label>
                <div className="relative">
                  <label className="block text-sm text-slate-600" htmlFor="sale-product">Product</label>
                  <div className="mt-1 flex">
                    <input
                      id="sale-product"
                      className="w-full rounded-l border border-slate-300 px-3 py-2"
                      value={saleProductQuery}
                      placeholder="Search or choose a product"
                      onChange={(event) => {
                        setSaleProductQuery(event.target.value);
                        setSaleProductId('');
                        setSalePrice('');
                        setSaleProductOpen(true);
                      }}
                      onFocus={() => setSaleProductOpen(true)}
                    />
                    <button type="button" className="rounded-r border border-l-0 border-slate-300 px-3" aria-label="Open product list" onClick={() => setSaleProductOpen((open) => !open)}>▾</button>
                  </div>
                  {saleProductOpen && (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow">
                      {productChoices.map((product) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSaleProductId(String(product.id));
                              setSaleProductQuery(product.name);
                              if (product.unit) setSaleUnit(product.unit);
                              setSalePrice(product.unit_price == null ? '' : (product.unit_price / 100).toFixed(2));
                              setSaleProductOpen(false);
                            }}
                          >
                            {product.name}
                          </button>
                        </li>
                      ))}
                      {productChoices.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No product with that name</li>}
                    </ul>
                  )}
                  {saleProduct && <span className="mt-1 block text-xs text-slate-500">{saleProduct.sku}</span>}
                </div>
                <label className="block text-sm text-slate-600">
                  Unit
                  <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={saleUnit} onChange={(event) => setSaleUnit(event.target.value)}>
                    {unitChoices.map((unit) => (
                      <option key={unit.code} value={unit.code}>{unit.name}</option>
                    ))}
                  </select>
                  {saleProduct && saleUnit !== saleProduct.unit && <span className="mt-1 block text-xs text-red-700">This product is sold in {saleProduct.unit}.</span>}
                </label>
                <label className="block text-sm text-slate-600">
                  Unit price
                  <input
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    value={saleProduct ? salePrice : ''}
                    onChange={(event) => setSalePrice(event.target.value)}
                    disabled={!saleProduct}
                    placeholder="45.34"
                  />
                  {saleProduct && saleProduct.unit_price == null && <span className="mt-1 block text-xs text-slate-500">This product has no price. Type the price for this sale.</span>}
                  {saleProduct && saleProduct.unit_price != null && <span className="mt-1 block text-xs text-slate-500">Filled from the product. Change it for this sale if you need a different price.</span>}
                </label>
                <label className="block text-sm text-slate-600">
                  Quantity
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={saleQty} onChange={(event) => setSaleQty(event.target.value)} inputMode="numeric" />
                  {saleProduct && <span className={`mt-1 block text-xs ${Number(saleQty) > saleAvailable ? 'text-red-700' : 'text-slate-500'}`}>{saleAvailable} {saleProduct.unit} in {saleShopName}</span>}
                </label>
                <p className="text-sm text-slate-700">Total {saleTotal.toFixed(2)}</p>
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Record sale</button>
              </form>
              )}
              {saleView === 'credit' && (
                <div className="mt-4 max-w-lg space-y-3">
                  <form
                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setCreditApplied(creditInvoice.trim());
                      setCreditPayId(null);
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
                          setCreditPayId(null);
                        }}
                      >
                        {shops.map((shop) => (
                          <option key={shop.name} value={shop.name}>{shop.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm text-slate-600">
                      Invoice number
                      <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={creditInvoice} onChange={(event) => setCreditInvoice(event.target.value)} placeholder="2" inputMode="numeric" />
                    </label>
                    <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Search</button>
                  </form>
                  {creditNote && <p className="text-sm text-red-700">{creditNote}</p>}
                  <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {creditSales.map((sale) => (
                      <li key={sale.id} className="px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoice number</p>
                        <p className="text-3xl font-semibold text-slate-900">{sale.invoiceNumber}</p>
                        <p className="text-sm text-slate-500">{sale.shop} · {sale.customer}</p>
                        <p className="text-sm text-slate-500">{sale.quantity} {sale.unit} of {sale.product}</p>
                        <p className="text-sm text-slate-700">Total {money(sale.totalCents)} · Paid {money(sale.paidCents)} · Left {money(sale.balanceCents)}</p>
                        {sale.payments?.length > 0 && (
                          <ul className="mt-1 text-xs text-slate-500">
                            {sale.payments.map((payment, index) => (
                              <li key={`${sale.id}-${index}`}>
                                {money(payment.amountCents)} {payment.payment === 'transfer' ? `transfer to ${payment.bankName}` : 'cash'}
                              </li>
                            ))}
                          </ul>
                        )}
                        {sale.balanceCents > 0 && creditPayId !== sale.id && (
                          <button type="button" className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => { setCreditPayId(sale.id); setCreditPayAmount(''); setCreditPayMethod('cash'); setCreditPayBank(''); }}>Take payment</button>
                        )}
                        {sale.balanceCents > 0 && creditPayId === sale.id && (
                          <form onSubmit={onPayCredit} className="mt-3 space-y-2">
                            <label className="block text-sm text-slate-600">
                              Amount
                              <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={creditPayAmount} onChange={(event) => setCreditPayAmount(event.target.value)} placeholder="10.00" />
                            </label>
                            <div className="flex border-b border-slate-300" role="tablist" aria-label="Payment">
                              <button type="button" role="tab" aria-selected={creditPayMethod === 'cash'} className={`rounded-t px-4 py-2 text-sm ${creditPayMethod === 'cash' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setCreditPayMethod('cash')}>Cash</button>
                              <button type="button" role="tab" aria-selected={creditPayMethod === 'transfer'} className={`rounded-t px-4 py-2 text-sm ${creditPayMethod === 'transfer' ? '-mb-px border border-b-white border-slate-300 bg-white font-medium' : 'text-slate-600'}`} onClick={() => setCreditPayMethod('transfer')}>Transfer</button>
                            </div>
                            {creditPayMethod === 'transfer' && (
                              <div role="tabpanel" aria-label="Bank" className="rounded-b border border-t-0 border-slate-300 p-4">
                                <p className="text-sm font-medium text-slate-900">Bank</p>
                                <label className="mt-3 block text-sm text-slate-600">
                                  Bank name
                                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={creditPayBank} onChange={(event) => setCreditPayBank(event.target.value)} placeholder="Type the bank name" />
                                </label>
                              </div>
                            )}
                            <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Record payment</button>
                          </form>
                        )}
                      </li>
                    ))}
                    {creditSales.length === 0 && !creditNote && <li className="px-4 py-3 text-sm text-slate-500">No credit invoice for this shop.</li>}
                  </ul>
                </div>
              )}
            </>
          )}
          {section === 'purchases' && (
            <PurchaseScreen
              shops={shops}
              products={products}
              suppliers={suppliers}
              units={unitChoices}
              onChanged={() => setSalesRevision((version) => version + 1)}
            />
          )}
          {section === 'transfers' && (
            <TransferScreen
              shops={shops}
              products={products}
              units={unitChoices}
              onChanged={() => setSalesRevision((version) => version + 1)}
            />
          )}
          {section === 'customers' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
              {customersNote && <p className="mt-4 text-sm text-red-700">{customersNote}</p>}
              <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {customers.map((customer) => (
                  <li key={customer.id} className="px-4 py-3">
                    <p className="font-medium text-slate-900">{customer.name}</p>
                    <p className="text-sm text-slate-500">{customer.is_walking ? 'Walk-in sale. No TIN.' : customer.tin}</p>
                  </li>
                ))}
                {customers.length === 0 && !customersNote && <li className="px-4 py-3 text-sm text-slate-500">No customers yet.</li>}
              </ul>
              <form onSubmit={onAddCustomer} className="mt-6 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm text-slate-600">
                  TIN
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={customerTin} onChange={(event) => setCustomerTin(event.target.value)} />
                  <span className="mt-1 block text-xs text-slate-500">The customer&apos;s tax identification number.</span>
                </label>
                <label className="block text-sm text-slate-600">
                  Organization name
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={customerOrgName} onChange={(event) => setCustomerOrgName(event.target.value)} />
                </label>
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Add customer</button>
              </form>
              <ExcelImport kind="customers" onSaved={loadCustomers} />
            </>
          )}
          {section === 'suppliers' && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
              {suppliersNote && <p className="mt-4 text-sm text-red-700">{suppliersNote}</p>}
              <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {suppliers.map((supplier) => (
                  <li key={supplier.id} className="px-4 py-3">
                    <p className="font-medium text-slate-900">{supplier.name}</p>
                    <p className="text-sm text-slate-500">{supplier.tin}</p>
                  </li>
                ))}
                {suppliers.length === 0 && !suppliersNote && <li className="px-4 py-3 text-sm text-slate-500">No suppliers yet.</li>}
              </ul>
              <form onSubmit={onAddSupplier} className="mt-6 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="block text-sm text-slate-600">
                  TIN
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={supplierTin} onChange={(event) => setSupplierTin(event.target.value)} />
                  <span className="mt-1 block text-xs text-slate-500">The supplier&apos;s tax identification number.</span>
                </label>
                <label className="block text-sm text-slate-600">
                  Organization name
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={supplierOrgName} onChange={(event) => setSupplierOrgName(event.target.value)} />
                </label>
                <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Add supplier</button>
              </form>
              <ExcelImport kind="suppliers" onSaved={loadSuppliers} />
            </>
          )}
          {section === 'users' && <StaffScreen />}
        </main>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">Inventory</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">{mode === 'login' ? 'Log in' : 'Create a company'}</h1>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {!user && mode === 'login' && (
        <form onSubmit={onLogin} className="mt-8 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm text-slate-600">
            Email or phone
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={loginId} onChange={(event) => setLoginId(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Password
            <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Log in</button>
          <button className="block text-sm text-slate-600 underline" type="button" onClick={() => { setMode('signup'); setError(null); }}>Create a company</button>
        </form>
      )}

      {!user && mode === 'signup' && (
        <form onSubmit={onSignup} className="mt-8 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm text-slate-600">
            Your name
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Company name
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Email
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Phone, optional
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Password
            <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} />
          </label>
          <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Create company</button>
          <button className="block text-sm text-slate-600 underline" type="button" onClick={() => { setMode('login'); setError(null); }}>I already have an account</button>
        </form>
      )}
    </main>
  );
}