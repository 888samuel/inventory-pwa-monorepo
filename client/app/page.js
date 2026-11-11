'use client';

import { useEffect, useState } from 'react';
import { ExcelImport } from './excel-import';
import { PurchaseScreen } from './purchase';
import { TransferScreen } from './transfer';
import { StaffScreen } from './staff';
import { ReportScreen } from './report';
import { SettingsScreen } from './settings';
import { BankField } from './bank-field';

const barColors = ['bg-emerald-500', 'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500'];
const roleName = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

function periodBounds(salesWhen, customDate) {
  if (salesWhen === 'custom' && customDate) {
    const start = new Date(`${customDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (salesWhen === 'week') start.setDate(start.getDate() - 6);
  if (salesWhen === 'month') start.setDate(start.getDate() - 29);
  return { start, end };
}

function Icon({ name, className = 'h-4 w-4' }) {
  const paths = {
    dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    reports: 'M4 19V10M10 19V5M16 19v-7M22 19H2',
    shops: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    products: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
    inventory: 'M3 7h18v13H3zM3 7l2-4h14l2 4M8 11h8',
    sales: 'M4 16l5-5 4 4 7-8M14 7h6v6',
    purchases: 'M6 7h15l-1.5 9h-12zM6 7L5 4H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    transfers: 'M7 7h11M15 4l3 3-3 3M17 17H6M9 14l-3 3 3 3',
    customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    suppliers: 'M1 16V6h13v10M14 9h5l3 3v4h-8M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    plus: 'M12 5v14M5 12h14',
    bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21a2 2 0 0 0 4 0',
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

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
  const [listShop, setListShop] = useState('all');
  const [listInvoice, setListInvoice] = useState('');
  const [listDate, setListDate] = useState('');
  const [completedSales, setCompletedSales] = useState([]);
  const [listNote, setListNote] = useState(null);
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
  const [sales, setSales] = useState({ units: 0, cents: 0, invoices: 0, bars: [], shops: [] });
  const [recentSales, setRecentSales] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(0);
  const [salesNote, setSalesNote] = useState(null);
  const [company, setCompany] = useState({ priceMode: 'dynamic', banks: [] });

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

  async function loadSettings() {
    const response = await fetch('/api/settings', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setCompany({
      priceMode: data.priceMode === 'fixed' ? 'fixed' : 'dynamic',
      banks: Array.isArray(data.banks) ? data.banks : [],
    });
  }

  useEffect(() => {
    if (!user) return undefined;
    const { start, end } = periodBounds(salesWhen, customDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    const params = new URLSearchParams({ from: start.toISOString(), to: end.toISOString() });
    if (salesShop !== 'all') params.set('shop', salesShop);
    let cancelled = false;
    fetch(`/api/sales?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setSales({ units: 0, cents: 0, invoices: 0, bars: [], shops: [] });
          setSalesNote(response.status === 404 ? 'Sales report is not connected yet.' : (data.error || 'Sales report is not available yet'));
          return;
        }
        setSalesNote(null);
        setSales({
          units: data.units ?? 0,
          cents: data.cents ?? 0,
          invoices: data.invoices ?? 0,
          bars: Array.isArray(data.bars) ? data.bars : [],
          shops: Array.isArray(data.shops) ? data.shops : [],
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
    if (!user || section !== 'dashboard') return undefined;
    const params = new URLSearchParams({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    let cancelled = false;
    fetch(`/api/sales/completed?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!cancelled) setRecentSales(response.ok && Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRecentSales([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, section, salesRevision]);

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    async function loadNotes() {
      const response = await fetch('/api/notifications', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (!cancelled && response.ok && Array.isArray(data)) setNotifications(data);
    }
    loadNotes();
    const timer = setInterval(loadNotes, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user, salesRevision]);

  async function openNotification(note) {
    setNotesOpen(false);
    if (!note.readAt) {
      const response = await fetch(`/api/notifications/${note.id}/read`, { method: 'POST', credentials: 'include' });
      if (response.ok) {
        setNotifications((list) => list.map((item) => (
          item.id === note.id ? { ...item, readAt: new Date().toISOString() } : item
        )));
      }
    }
    if (note.kind === 'transfer.accept') {
      setSection('transfers');
      setTransferOpen((opened) => opened + 1);
    }
  }

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
    if (!user || saleView !== 'list') return undefined;
    const invoice = listInvoice.trim();
    if (invoice && !/^\d+$/.test(invoice)) {
      setCompletedSales([]);
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
      fetch(`/api/sales/completed?${params}`, { credentials: 'include' })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (cancelled) return;
          if (!response.ok) {
            setCompletedSales([]);
            setListNote(data.error || 'Completed sales are not available yet');
            return;
          }
          setListNote(null);
          setCompletedSales(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) {
            setCompletedSales([]);
            setListNote('Completed sales are not available yet');
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, saleView, listShop, listInvoice, listDate, salesRevision]);

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
      await loadSettings();
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
    if (company.priceMode === 'fixed' && !price) {
      setError('Enter a price. Prices are set on the product.');
      return;
    }
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
    const typedPrice = company.priceMode === 'fixed'
      ? (product.unit_price == null ? '' : (Number(product.unit_price) / 100).toFixed(2))
      : salePrice.trim();
    if (company.priceMode === 'fixed') {
      if (product.unit_price == null) {
        setError('Set a price on this product');
        return;
      }
    } else if (!/^\d+(\.\d{1,2})?$/.test(typedPrice)) {
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
    if (salePayment === 'transfer' && !saleBank) {
      setError('Choose a bank');
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
        bankName: salePayment === 'transfer' ? saleBank : undefined,
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
    if (creditPayMethod === 'transfer' && !creditPayBank) {
      setError('Choose a bank');
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
        bankName: creditPayMethod === 'transfer' ? creditPayBank : undefined,
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
    setNotifications([]);
    setNotesOpen(false);
    setShops([]);
    setProducts([]);
    setCustomers([]);
    setSuppliers([]);
    setSaleShopName('');
    setCreditShop('');
    setStockShop('all');
    setSalesShop('all');
    setCompany({ priceMode: 'dynamic', banks: [] });
    setSection('dashboard');
    setError(null);
  }

  if (user) {
    const permissions = new Set(Array.isArray(user.permissions) ? user.permissions : []);
    const nav = [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'reports', label: 'Reports', icon: 'reports', permission: 'report' },
      { id: 'shops', label: 'Shops', icon: 'shops' },
      { id: 'products', label: 'Products', icon: 'products' },
      { id: 'inventory', label: 'Inventory', icon: 'inventory' },
      { id: 'sales', label: 'Sales', icon: 'sales' },
      { id: 'purchases', label: 'Purchases', icon: 'purchases' },
      { id: 'transfers', label: 'Transfer', icon: 'transfers' },
      { id: 'customers', label: 'Customers', icon: 'customers' },
      { id: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'settings', label: 'Settings', icon: 'settings', permission: 'settings.manage' },
    ].filter((item) => !item.permission || permissions.has(item.permission));
    const money = (cents) => (Number(cents) / 100).toFixed(2);
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const counts = {
      shops: shops.length || null,
      products: products.length || null,
      customers: customers.length || null,
    };
    const currentNav = nav.find((item) => item.id === section) || nav[0];
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
    const companyName = user.organization_name || 'Inventory';
    const unreadNotes = notifications.filter((note) => !note.readAt).length;
    const periodLabel = salesWhen === 'week' ? 'Last 7 days' : salesWhen === 'month' ? 'Last 30 days' : salesWhen === 'custom' ? customDate : 'Today';
    const averageCents = sales.invoices > 0 ? Math.round(Number(sales.cents) / Number(sales.invoices)) : 0;
    const shopTotals = new Map(sales.shops.map((shop) => [shop.name, shop]));
    const bounds = periodBounds(salesWhen, customDate);
    const visibleRecent = recentSales.filter((sale) => {
      const at = new Date(sale.soldAt);
      const inRange = at >= bounds.start && at < bounds.end;
      const inShop = salesShop === 'all' || sale.shop === salesShop;
      return inRange && inShop;
    });
    const needle = searchQuery.trim().toLowerCase();
    const searchResults = [
      ...nav.filter((item) => !needle || item.label.toLowerCase().includes(needle)).map((item) => ({ kind: 'Page', label: item.label, id: item.id })),
      ...shops.filter((shop) => !needle || shop.name.toLowerCase().includes(needle)).map((shop) => ({ kind: 'Shop', label: shop.name, id: 'shops' })),
      ...products.filter((product) => !needle || product.name.toLowerCase().includes(needle)).map((product) => ({ kind: 'Product', label: product.name, id: 'products' })),
      ...customers.filter((customer) => !needle || customer.name.toLowerCase().includes(needle)).map((customer) => ({ kind: 'Customer', label: customer.name, id: 'customers' })),
    ].slice(0, 8);
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
    const priceSource = !saleProduct
      ? ''
      : (company.priceMode === 'fixed'
        ? (saleProduct.unit_price == null ? '' : (Number(saleProduct.unit_price) / 100).toFixed(2))
        : salePrice.trim());
    const unitCents = /^\d+(\.\d{1,2})?$/.test(priceSource) ? Math.round(Number(priceSource) * 100) : 0;
    const qtyNumber = Number(saleQty);
    const totalCents = Number.isInteger(qtyNumber) && qtyNumber > 0 ? unitCents * qtyNumber : 0;
    const saleTotal = totalCents / 100;
    const paidNowCents = /^\d+(\.\d{1,2})?$/.test(salePaidNow.trim()) ? Math.round(Number(salePaidNow.trim()) * 100) : null;

    return (
      <div className="flex h-screen overflow-hidden bg-[#090d16] text-slate-100">
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 px-4 pt-24 backdrop-blur-md">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-[#111726] shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-800 p-4">
                <Icon name="search" className="h-5 w-5 text-slate-400" />
                <input
                  className="w-full border-none bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Search pages, shops, products, or customers"
                  value={searchQuery}
                  autoFocus
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button type="button" className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400" onClick={() => setSearchOpen(false)}>ESC</button>
              </div>
              <div className="px-2 py-3">
                {searchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.label}`}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    onClick={() => { setSection(result.id); setSearchOpen(false); setSearchQuery(''); }}
                  >
                    <span>{result.label}</span>
                    <span className="text-xs text-slate-500">{result.kind}</span>
                  </button>
                ))}
                {searchResults.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Nothing matches that search.</p>}
              </div>
            </div>
          </div>
        )}
        <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-slate-800/80 bg-[#0c111d]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-slate-800/80 p-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/90 p-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-[#0c111d]">
                    <Icon name="shops" className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-bold tracking-tight text-slate-100">{companyName}</p>
                  <p className="text-xs text-slate-400">Inventory</p>
                </div>
              </div>
            </div>
            <nav className="space-y-1 p-3">
              <p className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Core menu</p>
              {nav.map((item) => {
                const active = section === item.id;
                const count = counts[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium ${active ? 'border border-indigo-500/30 bg-gradient-to-r from-indigo-600/20 to-indigo-600/5 font-semibold text-indigo-300' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}`}
                    onClick={() => setSection(item.id)}
                  >
                    {active && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-indigo-500" />}
                    <span className="flex items-center gap-3">
                      <Icon name={item.icon} className={`h-4 w-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </span>
                    {count != null && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="border-t border-slate-800/80 p-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/40 p-2.5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-indigo-400">{initials}</div>
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-[#0c111d] bg-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                  <p className="text-[11px] text-slate-400">{roleName[user.role] || 'Staff'}</p>
                </div>
              </div>
              <button type="button" title="Log out" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" onClick={onLogout}>
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#090d16]/80 px-6 py-3.5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Workspace</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-white">{currentNav.label}</span>
            </div>
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
              <div className="relative">
                <button type="button" className="relative rounded-xl border border-slate-800 bg-slate-900/90 p-2 text-slate-400 hover:border-slate-700 hover:text-slate-200" aria-label="Notifications" onClick={() => setNotesOpen((open) => !open)}>
                  <Icon name="bell" className="h-4 w-4" />
                  {unreadNotes > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-[#090d16]" />}
                </button>
                {notesOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-800 bg-[#111726] py-3 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 pb-2">
                      <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">Notifications</span>
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">{unreadNotes} new</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((note) => (
                        <button key={note.id} type="button" className="block w-full px-4 py-3 text-left hover:bg-slate-800/40" onClick={() => openNotification(note)}>
                          <p className={`text-xs ${note.readAt ? 'text-slate-400' : 'font-medium text-slate-200'}`}>{note.body}</p>
                          <span className="mt-1 block text-[10px] text-slate-500">{new Date(note.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </button>
                      ))}
                      {notifications.length === 0 && <p className="px-4 py-3 text-xs text-slate-500">No notifications.</p>}
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200" onClick={() => setSearchOpen(true)}>
                <span className="flex items-center gap-2"><Icon name="search" className="h-3.5 w-3.5" /> Search</span>
                <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
              </button>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
                {[['today', 'Today'], ['week', '7 days'], ['month', '30 days']].map(([id, label]) => (
                  <button key={id} type="button" className={`rounded-lg px-3 py-1 font-medium ${salesWhen === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => setSalesWhen(id)}>{label}</button>
                ))}
              </div>
              <button type="button" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/10" onClick={() => { setSection('sales'); setSaleView('record'); }}>
                <Icon name="plus" className="h-4 w-4" />
                Record sale
              </button>
            </div>
          </header>
          <main className="workspace min-w-0 flex-1 overflow-y-auto px-6 py-8 md:px-8">
          {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
          {section === 'reports' && <ReportScreen shops={shops} />}
          {section === 'dashboard' && (
            <div className="mx-auto w-full max-w-7xl space-y-8">
              <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-[#121b2d] via-[#101726] to-[#0d121f] p-6 shadow-xl md:p-8">
                <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wider text-indigo-400 uppercase">{today}</p>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">{companyName}</h1>
                    <p className="mt-1.5 max-w-xl text-sm text-slate-400">Sales, stock, and shops for {periodLabel.toLowerCase()}{salesShop === 'all' ? ', across every shop' : ` at ${salesShop}`}.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs font-medium text-slate-400">Revenue · {periodLabel}</p>
                    <p className="text-lg font-bold text-white">{money(sales.cents)}</p>
                    <p className="text-xs text-slate-400">{sales.invoices} {sales.invoices === 1 ? 'sale' : 'sales'} · {sales.units} units</p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {[
                  ['Revenue', money(sales.cents), periodLabel],
                  ['Units sold', String(sales.units), periodLabel],
                  ['Shops', String(shops.length), 'Open'],
                  ['Average sale', money(averageCents), sales.invoices ? `${sales.invoices} sales` : periodLabel],
                ].map(([title, value, caption]) => (
                  <article key={title} className="rounded-2xl border border-slate-800/90 bg-[#0f1523] p-5 shadow-md">
                    <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</p>
                    <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
                    <p className="mt-3 border-t border-slate-800/60 pt-3 text-[11px] text-slate-500">{caption}</p>
                  </article>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border border-slate-800/90 bg-[#0f1523] p-6 shadow-md lg:col-span-2">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-base font-bold text-white">Sales breakdown <span className="text-xs font-normal text-slate-400">{periodLabel} · {salesShop === 'all' ? 'All shops' : salesShop}</span></h2>
                      <p className="mt-0.5 text-xs text-slate-400">What sold in this period, by product.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select className="rounded-xl border border-slate-800 bg-[#111726] px-3 py-1.5 text-xs text-slate-200" value={salesShop} onChange={(event) => setSalesShop(event.target.value)}>
                        <option value="all">All shops</option>
                        {shops.map((shop) => (
                          <option key={shop.name} value={shop.name}>{shop.name}</option>
                        ))}
                      </select>
                      <input type="date" className="rounded-xl border border-slate-800 bg-[#111726] px-3 py-1.5 text-xs text-slate-200" value={salesWhen === 'custom' ? customDate : ''} onChange={(event) => { setCustomDate(event.target.value); setSalesWhen(event.target.value ? 'custom' : 'today'); }} />
                    </div>
                  </div>
                  {salesNote && <p className="mt-4 text-sm text-red-400">{salesNote}</p>}
                  <ul className="mt-6 space-y-5">
                    {sales.bars.map((bar, index) => {
                      const share = sales.cents ? Math.round((Number(bar.cents) / Number(sales.cents)) * 1000) / 10 : 0;
                      return (
                        <li key={bar.label} className="space-y-2">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${barColors[index % barColors.length]}`} />
                              <span className="font-semibold text-slate-200">{bar.label}</span>
                            </span>
                            <span className="text-right">
                              <span className="font-bold text-white">{money(bar.cents)}</span>
                              <span className="ml-2 text-xs text-slate-400">({bar.units} sold)</span>
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full border border-slate-800 bg-slate-900 p-0.5">
                            <div className={`h-full rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${share}%` }} />
                          </div>
                        </li>
                      );
                    })}
                    {!salesNote && sales.bars.length === 0 && <li className="text-sm text-slate-500">No sales in this period.</li>}
                  </ul>
                  <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
                    <span>{products.length} products on file</span>
                    <button type="button" className="font-medium text-indigo-400 hover:text-indigo-300" onClick={() => setSection('inventory')}>View inventory</button>
                  </div>
                </section>

                <section className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0f1523] p-6 shadow-md">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-white">Where you sell</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Shops and what they sold in this period</p>
                      </div>
                      <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-400">{shops.length} active</span>
                    </div>
                    <ul className="mt-5 space-y-3.5">
                      {shops.map((shop) => {
                        const totals = shopTotals.get(shop.name);
                        return (
                          <li key={shop.name} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-100">{shop.name}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{shop.location}</p>
                              </div>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${totals ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                                {totals ? 'Sold' : 'Quiet'}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3 text-xs">
                              <span className="text-slate-400">Revenue</span>
                              <span className="font-bold text-white">{money(totals?.cents || 0)} <span className="font-normal text-slate-400">({totals?.invoices || 0} sales)</span></span>
                            </div>
                          </li>
                        );
                      })}
                      {shops.length === 0 && <li className="text-sm text-slate-500">No shops yet.</li>}
                    </ul>
                  </div>
                  <button type="button" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white" onClick={() => setSection('shops')}>
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    Register a shop
                  </button>
                </section>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0f1523] shadow-md">
                <div className="border-b border-slate-800/80 p-6">
                  <h2 className="text-base font-bold text-white">Recent sales</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Recorded sales for {periodLabel.toLowerCase()}.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 bg-[#0c111d] text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Invoice</th>
                        <th className="px-6 py-3.5">Customer</th>
                        <th className="px-6 py-3.5">Items</th>
                        <th className="px-6 py-3.5">Shop</th>
                        <th className="px-6 py-3.5">Recorded by</th>
                        <th className="px-6 py-3.5">Payment</th>
                        <th className="px-6 py-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {visibleRecent.map((sale) => {
                        const payment = sale.payment === 'transfer' ? `Transfer · ${sale.bankName}` : sale.payment === 'credit' ? (sale.balanceCents > 0 ? 'Credit open' : 'Credit paid') : 'Cash';
                        const open = sale.balanceCents > 0;
                        return (
                          <tr key={sale.id} className="hover:bg-slate-900/50">
                            <td className="px-6 py-4 font-mono font-semibold text-indigo-400">{sale.invoiceNumber}</td>
                            <td className="px-6 py-4 text-slate-200">{sale.customer}</td>
                            <td className="px-6 py-4">{sale.quantity} {sale.unit} {sale.product}</td>
                            <td className="px-6 py-4 text-slate-400">{sale.shop}</td>
                            <td className="px-6 py-4 text-slate-300">{sale.createdBy || 'Not recorded'}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${open ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                {payment}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-white">{money(sale.totalCents)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#0c111d] p-4 text-xs text-slate-400">
                  <span>{visibleRecent.length === 0 ? 'No sales in this period' : `${visibleRecent.length} ${visibleRecent.length === 1 ? 'sale' : 'sales'}`}</span>
                  <button type="button" className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-slate-300 hover:text-white" onClick={() => { setSection('sales'); setSaleView('list'); }}>Open sales list</button>
                </div>
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
                  Price {company.priceMode === 'dynamic' && <span className="text-slate-400">optional</span>}
                  <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="45.34" />
                  <span className="mt-1 block text-xs text-slate-500">
                    {company.priceMode === 'fixed'
                      ? 'Prices are set. This price is used on every sale and purchase.'
                      : 'Leave this empty when the price is typed at the sale or purchase.'}
                  </span>
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
              <p className="mt-1 text-sm text-slate-500">Sell from one shop, look up a completed sale, or take a payment on a credit invoice.</p>
              {saleNotice && <p className="mt-4 text-sm text-teal-800">{saleNotice}</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className={`rounded px-3 py-2 text-sm ${saleView === 'record' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setSaleView('record')}>Record sale</button>
                <button type="button" className={`rounded px-3 py-2 text-sm ${saleView === 'list' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white'}`} onClick={() => setSaleView('list')}>Completed sales</button>
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
                    <BankField id="sale-bank-panel" banks={company.banks} value={saleBank} onChange={setSaleBank} />
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
                    value={saleProduct ? priceSource : ''}
                    onChange={(event) => setSalePrice(event.target.value)}
                    disabled={!saleProduct || company.priceMode === 'fixed'}
                    placeholder="45.34"
                  />
                  {saleProduct && company.priceMode === 'fixed' && saleProduct.unit_price == null && <span className="mt-1 block text-xs text-slate-500">Set a price on this product before you sell it.</span>}
                  {saleProduct && company.priceMode === 'fixed' && saleProduct.unit_price != null && <span className="mt-1 block text-xs text-slate-500">This price is set on the product.</span>}
                  {saleProduct && company.priceMode === 'dynamic' && saleProduct.unit_price == null && <span className="mt-1 block text-xs text-slate-500">This product has no price. Type the price for this sale.</span>}
                  {saleProduct && company.priceMode === 'dynamic' && saleProduct.unit_price != null && <span className="mt-1 block text-xs text-slate-500">Filled from the product. Change it for this sale if you need a different price.</span>}
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
                        <p className="text-sm text-slate-500">{sale.createdBy ? `Recorded by ${sale.createdBy}` : 'Person was not saved'}</p>
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
                              <BankField banks={company.banks} value={creditPayBank} onChange={setCreditPayBank} />
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
              {saleView === 'list' && (
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
                    {completedSales.map((sale) => {
                      const when = new Date(sale.soldAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                      const paymentLabel = sale.payment === 'transfer'
                        ? `Transfer to ${sale.bankName}`
                        : sale.payment === 'credit'
                          ? 'Credit'
                          : 'Cash';
                      return (
                        <li key={sale.id} className="px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoice number</p>
                          <p className="text-3xl font-semibold text-slate-900">{sale.invoiceNumber}</p>
                          <p className="text-sm text-slate-500">{when} · {sale.shop}</p>
                          <p className="text-sm text-slate-700">{sale.customer}</p>
                          <p className="text-sm text-slate-500">{sale.createdBy ? `Recorded by ${sale.createdBy}` : 'Person was not saved'}</p>
                          <p className="text-sm text-slate-500">{sale.quantity} {sale.unit} of {sale.product}</p>
                          <p className="text-sm text-slate-700">{paymentLabel} · Total {money(sale.totalCents)} · Paid {money(sale.paidCents)}{sale.balanceCents > 0 ? ` · Left ${money(sale.balanceCents)}` : ''}</p>
                        </li>
                      );
                    })}
                    {!listNote && completedSales.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No completed sales match these filters.</li>}
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
              banks={company.banks}
              priceMode={company.priceMode}
              onChanged={() => setSalesRevision((version) => version + 1)}
            />
          )}
          {section === 'transfers' && (
            <TransferScreen
              shops={shops}
              products={products}
              units={unitChoices}
              openConfirm={transferOpen}
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
          {section === 'settings' && <SettingsScreen onChanged={loadSettings} />}
        </main>
      </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-slate-400 uppercase">Inventory</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{mode === 'login' ? 'Log in' : 'Create a company'}</h1>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {!user && mode === 'login' && (
        <form onSubmit={onLogin} className="mt-8 space-y-3 rounded-2xl border border-slate-800 bg-[#111726] p-5 shadow-sm">
          <label className="block text-sm text-slate-400">
            Email or phone
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={loginId} onChange={(event) => setLoginId(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-400">
            Password
            <input type="password" className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Log in</button>
          <button className="block text-sm text-slate-400 underline" type="button" onClick={() => { setMode('signup'); setError(null); }}>Create a company</button>
        </form>
      )}

      {!user && mode === 'signup' && (
        <form onSubmit={onSignup} className="mt-8 space-y-3 rounded-2xl border border-slate-800 bg-[#111726] p-5 shadow-sm">
          <label className="block text-sm text-slate-400">
            Your name
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-400">
            Company name
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-400">
            Email
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-400">
            Phone, optional
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-400">
            Password
            <input type="password" className="mt-1 w-full rounded-xl border border-slate-700 bg-[#172033] px-3 py-2 text-white" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} />
          </label>
          <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Create company</button>
          <button className="block text-sm text-slate-400 underline" type="button" onClick={() => { setMode('login'); setError(null); }}>I already have an account</button>
        </form>
      )}
    </main>
  );
}