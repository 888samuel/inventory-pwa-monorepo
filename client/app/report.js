'use client';

import { useEffect, useState } from 'react';

function ymd(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return ymd(date);
}

function money(cents) {
  return (Number(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function countLabel(count, singular, plural) {
  return `${count} ${Number(count) === 1 ? singular : plural}`;
}

function rangeFor(preset, customFrom, customTo) {
  const today = ymd(new Date());
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') return { from: shiftDays(today, -6), to: today };
  if (preset === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: customFrom, to: customTo };
}

function DayChart({ days, leftKey, rightKey, leftLabel, rightLabel, leftColor, rightColor }) {
  const max = Math.max(1, ...days.map((day) => Math.max(day[leftKey], day[rightKey])));
  const group = days.length > 60 ? 28 : days.length > 31 ? 36 : 52;
  const width = Math.max(days.length * group + 16, 320);
  const height = 220;
  const padT = 12;
  const padB = 32;
  const innerH = height - padT - padB;
  const labelEvery = Math.ceil(days.length / 12);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label={`${leftLabel} and ${rightLabel} by day`}>
        <line x1="8" y1={padT + innerH} x2={width - 8} y2={padT + innerH} stroke="#334155" />
        {days.map((day, index) => {
          const x = 12 + index * group;
          const left = (day[leftKey] / max) * innerH;
          const right = (day[rightKey] / max) * innerH;
          const bar = Math.min(14, group / 3);
          return (
            <g key={day.date}>
              <rect x={x} y={padT + innerH - left} width={bar} height={Math.max(left, day[leftKey] ? 2 : 0)} rx="3" fill={leftColor}>
                <title>{`${day.date} ${leftLabel} ${money(day[leftKey])}`}</title>
              </rect>
              <rect x={x + bar + 3} y={padT + innerH - right} width={bar} height={Math.max(right, day[rightKey] ? 2 : 0)} rx="3" fill={rightColor}>
                <title>{`${day.date} ${rightLabel} ${money(day[rightKey])}`}</title>
              </rect>
              {(index % labelEvery === 0) && (
                <text x={x + bar} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {day.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Mix({ parts }) {
  const total = parts.reduce((sum, part) => sum + part.cents, 0);
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {total > 0 && parts.map((part) => (
          <div
            key={part.label}
            style={{ width: `${(part.cents / total) * 100}%`, background: part.color }}
            title={`${part.label} ${money(part.cents)}`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: part.color }} />
              {part.label}
            </span>
            <span className="font-medium text-slate-900">
              {money(part.cents)}
              <span className="ml-2 font-normal text-slate-500">{total ? Math.round((part.cents / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HBars({ rows, leftKey, rightKey, leftLabel, rightLabel, leftColor, rightColor }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row[leftKey], row[rightKey])));
  if (rows.length === 0) return <p className="text-sm text-slate-500">Nothing in this period.</p>;
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.name || row.bank}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <p className="font-medium text-slate-900">{row.name || row.bank}</p>
            <p className="text-slate-600">{money(row[leftKey])} {leftLabel} · {money(row[rightKey])} {rightLabel}</p>
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(row[leftKey] / max) * 100}%`, background: leftColor }} />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${(row[rightKey] / max) * 100}%`, background: rightColor }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PartyList({ rows, empty }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.cents));
  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={`${row.name}-${index}`}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-slate-600">{`${money(row.cents)} · ${countLabel(row.invoices, 'invoice', 'invoices')}`}</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(8, (row.cents / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const emptyReport = {
  banks: [],
  sales: { count: 0, units: 0, cents: 0, cashCents: 0, transferCents: 0, creditCents: 0 },
  purchases: { count: 0, units: 0, cents: 0, cashCents: 0, transferCents: 0, creditCents: 0 },
  money: {
    cashInCents: 0,
    cashOutCents: 0,
    bankInCents: 0,
    bankOutCents: 0,
    counterInCents: 0,
    counterOutCents: 0,
    creditCollectedInCents: 0,
    creditPaidOutCents: 0,
  },
  receivableCents: 0,
  receivableInvoices: 0,
  payableCents: 0,
  payableInvoices: 0,
  days: [],
  shops: [],
  bankFlows: [],
  owedToYou: [],
  youOwe: [],
};

export function ReportScreen({ shops }) {
  const today = ymd(new Date());
  const [preset, setPreset] = useState('month');
  const [customFrom, setCustomFrom] = useState(shiftDays(today, -6));
  const [customTo, setCustomTo] = useState(today);
  const [shop, setShop] = useState('all');
  const [bank, setBank] = useState('all');
  const [banks, setBanks] = useState([]);
  const [report, setReport] = useState(emptyReport);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  const { from, to } = rangeFor(preset, customFrom, customTo);
  const rangeReady = Boolean(from && to && from <= to);

  useEffect(() => {
    if (shop !== 'all' && !shops.some((item) => item.name === shop)) setShop('all');
  }, [shops, shop]);

  useEffect(() => {
    if (!rangeReady) return undefined;
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${shiftDays(to, 1)}T00:00:00`);
    const params = new URLSearchParams({
      from: start.toISOString(),
      to: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    if (shop !== 'all') params.set('shop', shop);
    if (bank !== 'all') params.set('bank', bank);
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reports?${params}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setReport(emptyReport);
          setNote(data.error || 'The report is not available yet');
          setLoading(false);
          return;
        }
        setNote(null);
        setReport({ ...emptyReport, ...data });
        setBanks(Array.isArray(data.banks) ? data.banks : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNote('The report is not available yet');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, shop, bank, rangeReady]);

  const bankChoices = banks.includes(bank) || bank === 'all' || bank === 'cash' ? banks : [bank, ...banks];
  const salesParts = [
    { label: 'Cash', cents: report.sales.cashCents, color: '#0f766e' },
    { label: 'Bank transfer', cents: report.sales.transferCents, color: '#1d4ed8' },
    { label: 'Credit', cents: report.sales.creditCents, color: '#b45309' },
  ];
  const purchaseParts = [
    { label: 'Cash', cents: report.purchases.cashCents, color: '#0f766e' },
    { label: 'Bank transfer', cents: report.purchases.transferCents, color: '#1d4ed8' },
    { label: 'Credit', cents: report.purchases.creditCents, color: '#b45309' },
  ];
  const presetClass = (id) => `rounded px-3 py-2 text-sm ${preset === id ? 'bg-slate-900 text-white' : 'border border-slate-300'}`;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-500">
        Sales and purchases are invoices in this period. Cash and bank are money that moved, including payments on older credit. Open credit is what is still unpaid at the end of the period.
      </p>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={shop} onChange={(event) => setShop(event.target.value)}>
            <option value="all">All shops</option>
            {shops.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
          <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={bank} onChange={(event) => setBank(event.target.value)}>
            <option value="all">All money</option>
            <option value="cash">Cash only</option>
            {bankChoices.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <button type="button" className={presetClass('today')} onClick={() => setPreset('today')}>Today</button>
          <button type="button" className={presetClass('week')} onClick={() => setPreset('week')}>Last 7 days</button>
          <button type="button" className={presetClass('month')} onClick={() => setPreset('month')}>This month</button>
          <button type="button" className={presetClass('custom')} onClick={() => setPreset('custom')}>Custom</button>
        </div>
        {preset === 'custom' && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-sm text-slate-600">
              From
              <input type="date" className="mt-1 block rounded border border-slate-300 px-3 py-2" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
            </label>
            <label className="text-sm text-slate-600">
              To
              <input type="date" className="mt-1 block rounded border border-slate-300 px-3 py-2" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
            </label>
          </div>
        )}
        <p className="mt-3 text-sm text-slate-500">
          {from && to ? `${from} to ${to}` : 'Choose a start and an end'}
          {' · '}
          {shop === 'all' ? 'All shops' : shop}
          {' · '}
          {bank === 'all' ? 'All money' : bank === 'cash' ? 'Cash only' : bank}
        </p>
        {!rangeReady && <p className="mt-2 text-sm text-red-700">The start has to be on or before the end.</p>}
        {bank !== 'all' && (
          <p className="mt-2 text-sm text-slate-500">
            {`This filter keeps invoices and money for ${bank === 'cash' ? 'cash' : bank}. Open credit stays the full unpaid balance for the shops above.`}
          </p>
        )}
        {!loading && banks.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">Add bank names in Settings to filter by a bank.</p>
        )}
      </section>

      {note && <p className="mt-4 text-sm text-red-700">{note}</p>}
      {loading && !note && <p className="mt-4 text-sm text-slate-500">Loading the report…</p>}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-slate-900 p-5 text-white">
          <p className="text-xs tracking-wide text-slate-400 uppercase">Sales</p>
          <p className="mt-2 text-2xl font-semibold">{money(report.sales.cents)}</p>
          <p className="mt-1 text-xs text-slate-400">{countLabel(report.sales.count, 'invoice', 'invoices')} · {countLabel(report.sales.units, 'unit', 'units')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Purchases</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(report.purchases.cents)}</p>
          <p className="mt-1 text-xs text-slate-500">{countLabel(report.purchases.count, 'invoice', 'invoices')} · {countLabel(report.purchases.units, 'unit', 'units')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Customers owe you</p>
          <p className="mt-2 text-2xl font-semibold text-teal-800">{money(report.receivableCents)}</p>
          <p className="mt-1 text-xs text-slate-500">{countLabel(report.receivableInvoices, 'open credit invoice', 'open credit invoices')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs tracking-wide text-slate-500 uppercase">You owe suppliers</p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">{money(report.payableCents)}</p>
          <p className="mt-1 text-xs text-slate-500">{countLabel(report.payableInvoices, 'open credit invoice', 'open credit invoices')}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs text-slate-500">Cash in</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{money(report.money.cashInCents)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs text-slate-500">Cash out</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{money(report.money.cashOutCents)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs text-slate-500">Bank in</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{money(report.money.bankInCents)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs text-slate-500">Bank out</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{money(report.money.bankOutCents)}</p>
        </article>
      </section>
      <p className="mt-3 text-sm text-slate-500">
        Net cash {money(report.money.cashInCents - report.money.cashOutCents)}
        {' · '}
        Net bank {money(report.money.bankInCents - report.money.bankOutCents)}
        {' · '}
        Net invoices {money(report.sales.cents - report.purchases.cents)}
      </p>
      {(report.money.counterInCents > 0 || report.money.counterOutCents > 0) && (
        <p className="mt-1 text-sm text-slate-500">
          Paid at the counter on credit invoices: {money(report.money.counterInCents)} in, {money(report.money.counterOutCents)} out. That amount is not marked cash or bank.
        </p>
      )}
      {(report.money.creditCollectedInCents > 0 || report.money.creditPaidOutCents > 0) && (
        <p className="mt-1 text-sm text-slate-500">
          Later credit payments inside cash and bank: {money(report.money.creditCollectedInCents)} collected from customers, {money(report.money.creditPaidOutCents)} paid to suppliers.
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sales and purchases by day</h2>
          <p className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700" /> Sales</span>
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" /> Purchases</span>
          </p>
        </div>
        <div className="mt-4">
          {report.days.length > 0
            ? <DayChart days={report.days} leftKey="salesCents" rightKey="purchasesCents" leftLabel="Sales" rightLabel="Purchases" leftColor="#0f766e" rightColor="#d97706" />
            : <p className="text-sm text-slate-500">No days in this period.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Bank in and bank out by day</h2>
          <p className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#1d4ed8' }} /> Bank in</span>
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#7c3aed' }} /> Bank out</span>
          </p>
        </div>
        <div className="mt-4">
          {report.days.length > 0
            ? <DayChart days={report.days} leftKey="bankInCents" rightKey="bankOutCents" leftLabel="Bank in" rightLabel="Bank out" leftColor="#1d4ed8" rightColor="#7c3aed" />
            : <p className="text-sm text-slate-500">No days in this period.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Cash in and cash out by day</h2>
          <p className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#047857' }} /> Cash in</span>
            <span className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#be123c' }} /> Cash out</span>
          </p>
        </div>
        <div className="mt-4">
          {report.days.length > 0
            ? <DayChart days={report.days} leftKey="cashInCents" rightKey="cashOutCents" leftLabel="Cash in" rightLabel="Cash out" leftColor="#047857" rightColor="#be123c" />
            : <p className="text-sm text-slate-500">No days in this period.</p>}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How sales were billed</h2>
          <div className="mt-4"><Mix parts={salesParts} /></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How purchases were billed</h2>
          <div className="mt-4"><Mix parts={purchaseParts} /></div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By shop</h2>
          <p className="mt-1 text-sm text-slate-500">Teal is sales. Amber is purchases.</p>
          <div className="mt-4">
            <HBars rows={report.shops.map((item) => ({ name: item.name, salesCents: item.salesCents, purchasesCents: item.purchasesCents }))} leftKey="salesCents" rightKey="purchasesCents" leftLabel="sales" rightLabel="purchases" leftColor="#0f766e" rightColor="#d97706" />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By bank</h2>
          <p className="mt-1 text-sm text-slate-500">Blue is money in. Violet is money out.</p>
          <div className="mt-4">
            {report.bankFlows.length === 0
              ? <p className="text-sm text-slate-500">No bank transfers in this period.</p>
              : <HBars rows={report.bankFlows} leftKey="inCents" rightKey="outCents" leftLabel="in" rightLabel="out" leftColor="#1d4ed8" rightColor="#7c3aed" />}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Money owed to you</h2>
          <p className="mt-1 text-sm text-slate-500">Customers with credit still open.</p>
          <div className="mt-4">
            <PartyList rows={report.owedToYou} empty="Nobody owes you on open credit." />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Credit you owe</h2>
          <p className="mt-1 text-sm text-slate-500">Suppliers the organization still has to pay.</p>
          <div className="mt-4">
            <PartyList rows={report.youOwe} empty="You do not owe suppliers on open credit." />
          </div>
        </section>
      </div>
    </div>
  );
}
