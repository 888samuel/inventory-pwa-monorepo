'use client';

import { useEffect, useState } from 'react';

export function SettingsScreen({ onChanged }) {
  const [priceMode, setPriceMode] = useState('dynamic');
  const [banks, setBanks] = useState([]);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  function apply(data) {
    setPriceMode(data.priceMode === 'fixed' ? 'fixed' : 'dynamic');
    setBanks(Array.isArray(data.banks) ? data.banks : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings', { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.status === 403) {
          setBlocked(true);
          setReady(true);
          setError(data.error || 'You cannot configure settings');
          return;
        }
        if (!response.ok) {
          setReady(true);
          setError(data.error || 'Settings are not available yet');
          return;
        }
        apply(data);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
          setError('Settings are not available yet');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveMode(next) {
    setError(null);
    setNotice(null);
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ priceMode: next }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not save the price setting');
      return;
    }
    apply(data);
    setNotice(next === 'fixed' ? 'Prices are set on the product.' : 'Prices can be typed on each sale and purchase.');
    onChanged();
  }

  async function addBank(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const response = await fetch('/api/settings/banks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not add the bank');
      return;
    }
    apply(data);
    setName('');
    setNotice(`${name.trim()} is in the bank list.`);
    onChanged();
  }

  async function removeBank(id) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/settings/banks/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not remove the bank');
      return;
    }
    apply(data);
    setConfirmId(null);
    setNotice('The bank was removed from the list.');
    onChanged();
  }

  if (!ready) return <p className="text-sm text-slate-500">Loading settings…</p>;
  if (blocked) return <p className="text-sm text-red-700">{error}</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Choose how prices work, and keep the bank names this company uses.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 text-sm text-teal-800">{notice}</p>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Prices</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={`rounded px-3 py-2 text-sm ${priceMode === 'fixed' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => saveMode('fixed')}>Set prices</button>
          <button type="button" className={`rounded px-3 py-2 text-sm ${priceMode === 'dynamic' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`} onClick={() => saveMode('dynamic')}>Dynamic prices</button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {priceMode === 'fixed'
            ? 'Each product keeps the price you save on it. Sales and purchases use that price.'
            : 'A product can have no price, and the price can be typed when you sell or buy.'}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Banks</h2>
        <p className="mt-1 text-sm text-slate-500">These names are the choices on a transfer, and the bank filter on Reports.</p>
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {banks.map((bank) => (
            <li key={bank.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="font-medium text-slate-900">{bank.name}</p>
              {confirmId === bank.id ? (
                <span className="flex gap-2">
                  <button type="button" className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => removeBank(bank.id)}>Remove</button>
                  <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setConfirmId(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setConfirmId(bank.id)}>Remove</button>
              )}
            </li>
          ))}
          {banks.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No banks yet.</li>}
        </ul>
        <form onSubmit={addBank} className="mt-4 flex gap-2">
          <label className="block flex-1 text-sm text-slate-600">
            Bank name
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="CBE" />
          </label>
          <button className="mt-6 h-fit rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">Add bank</button>
        </form>
      </section>
    </div>
  );
}
