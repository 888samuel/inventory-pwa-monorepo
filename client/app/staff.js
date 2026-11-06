'use client';

import { useEffect, useState } from 'react';

const roleLabel = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
};

export function StaffScreen() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [everyShop, setEveryShop] = useState(false);
  const [shopIds, setShopIds] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const permissionLabel = (code) => permissions.find((item) => item.code === code)?.description || code;

  async function load() {
    const response = await fetch('/api/staff', { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) {
      setBlocked(true);
      setReady(true);
      setError(data.error || 'You cannot add users');
      return;
    }
    if (!response.ok) {
      setReady(true);
      setError(data.error || 'Users are not available yet');
      return;
    }
    setBlocked(false);
    setError(null);
    setReady(true);
    setUsers(Array.isArray(data.users) ? data.users : []);
    setShops(Array.isArray(data.shops) ? data.shops : []);
    setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/staff', { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.status === 403) {
          setBlocked(true);
          setReady(true);
          setError(data.error || 'You cannot add users');
          return;
        }
        if (!response.ok) {
          setReady(true);
          setError(data.error || 'Users are not available yet');
          return;
        }
        setUsers(Array.isArray(data.users) ? data.users : []);
        setShops(Array.isArray(data.shops) ? data.shops : []);
        setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
          setError('Users are not available yet');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleShop(id) {
    setShopIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function togglePermission(code) {
    setChosen((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  function clearForm() {
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('cashier');
    setEveryShop(false);
    setShopIds([]);
    setChosen([]);
  }

  function startEdit(person) {
    setEditingId(person.id);
    setConfirmDeleteId(null);
    setName(person.name);
    setEmail(person.email);
    setPhone(person.phone || '');
    setPassword('');
    setRole(person.role === 'manager' ? 'manager' : 'cashier');
    setEveryShop(Boolean(person.managesAll));
    setShopIds((person.shopIds || []).map((id) => Number(id)));
    setChosen([...(person.permissions || [])]);
    setError(null);
    setNotice(null);
  }

  async function onCreate(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!everyShop && shopIds.length === 0) {
      setError('Choose at least one shop, or every shop');
      return;
    }
    const response = await fetch(editingId ? `/api/staff/${editingId}` : '/api/staff', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        managesAll: everyShop,
        branchIds: everyShop ? [] : shopIds,
        permissions: chosen,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || (editingId ? 'Could not update the user' : 'Could not create the user'));
      return;
    }
    const savedName = data.name;
    const savedRole = roleLabel[data.role] || data.role;
    clearForm();
    setNotice(editingId ? `${savedName} was updated.` : `${savedName} can log in as a ${savedRole}.`);
    await load();
  }

  async function onDelete(person) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/staff/${person.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'Could not delete the user');
      return;
    }
    if (editingId === person.id) clearForm();
    setConfirmDeleteId(null);
    setNotice(`${data.name} was deleted.`);
    await load();
  }

  function shopsFor(person) {
    if (person.role === 'owner' || person.managesAll) return 'Every shop';
    if (!person.shops?.length) return 'No shop';
    return person.shops.join(', ');
  }

  function permissionsFor(person) {
    if (person.role === 'owner') return 'All permissions';
    if (!person.permissions?.length) return 'No permissions';
    return person.permissions.map(permissionLabel).join(', ');
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">The owner is created with the company. Add a cashier or a manager, choose their shops, and choose what they can do.</p>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 text-sm text-teal-800">{notice}</p>}
      <ul className="mt-6 max-w-lg divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {users.map((person) => (
          <li key={person.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{person.name}</p>
                <p className="text-sm text-slate-500">{roleLabel[person.role] || person.role} · {person.email}</p>
                <p className="text-sm text-slate-500">{shopsFor(person)}</p>
                <p className="text-sm text-slate-500">{permissionsFor(person)}</p>
              </div>
              {person.role !== 'owner' && (
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => startEdit(person)}>Edit</button>
                  <button type="button" className="rounded border border-red-200 px-3 py-1 text-sm text-red-700" onClick={() => setConfirmDeleteId(person.id)}>Delete</button>
                </div>
              )}
            </div>
            {confirmDeleteId === person.id && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm text-slate-600">Delete {person.name}?</p>
                <button type="button" className="rounded bg-red-700 px-3 py-1 text-sm text-white" onClick={() => onDelete(person)}>Delete</button>
                <button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              </div>
            )}
          </li>
        ))}
        {ready && users.length === 0 && !blocked && <li className="px-4 py-3 text-sm text-slate-500">No users yet.</li>}
      </ul>
      {ready && !blocked && (
        <form onSubmit={onCreate} className="mt-6 max-w-lg space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm text-slate-600">
            Name
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Email
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Phone <span className="text-slate-400">optional</span>
            <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="15551212000" />
          </label>
          <label className="block text-sm text-slate-600">
            Password {editingId && <span className="text-slate-400">leave blank to keep it</span>}
            <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="block text-sm text-slate-600">
            Role
            <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
            <span className="mt-1 block text-xs text-slate-500">The title is a label. The permissions below decide what this person can do.</span>
          </label>
          <fieldset className="text-sm text-slate-600">
            <legend>Shops</legend>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={everyShop}
                onChange={(event) => {
                  setEveryShop(event.target.checked);
                  if (event.target.checked) setShopIds([]);
                }}
              />
              Every shop
            </label>
            {!everyShop && shops.length === 0 && <p className="mt-2 text-sm text-slate-500">This company has no shops yet. Add them on the Shops page.</p>}
            {!everyShop && shops.map((shop) => (
              <label key={shop.id} className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={shopIds.includes(Number(shop.id))} onChange={() => toggleShop(Number(shop.id))} />
                {shop.name}
              </label>
            ))}
          </fieldset>
          <fieldset className="text-sm text-slate-600">
            <legend>Permissions</legend>
            {permissions.map((item) => (
              <label key={item.code} className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={chosen.includes(item.code)} onChange={() => togglePermission(item.code)} />
                {item.description}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white" type="submit">{editingId ? 'Save changes' : 'Create user'}</button>
            {editingId && <button className="rounded border border-slate-300 px-4 py-2 text-sm" type="button" onClick={clearForm}>Cancel</button>}
          </div>
        </form>
      )}
    </>
  );
}
