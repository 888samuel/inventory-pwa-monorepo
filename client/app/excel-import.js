'use client';

import { useState } from 'react';
import { IMPORTS, downloadTemplate, parseFile } from './excel';

export function ExcelImport({ kind, onSaved }) {
  const spec = IMPORTS[kind];
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState(null);
  const [savedNote, setSavedNote] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setSavedNote(null);
    setNote(null);
    if (!file) return;
    try {
      const parsed = await parseFile(file, kind);
      setPreview({ filename: file.name, ...parsed });
    } catch {
      setPreview(null);
      setNote('That file could not be read. Use an Excel file (.xlsx).');
    }
  }

  async function onSave() {
    if (!preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    setBusy(true);
    setNote(null);
    setSavedNote(null);
    try {
      const response = await fetch(spec.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rows: preview.rows }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setNote('Import is not connected yet. The save route still has to be added.');
        return;
      }
      if (!response.ok) {
        const rowErrors = Array.isArray(data.errors) ? data.errors : [];
        if (rowErrors.length > 0) {
          setPreview({ ...preview, rows: [], errors: rowErrors });
        }
        setNote(data.error || 'Could not save the file');
        return;
      }
      setPreview(null);
      setSavedNote(`Saved ${data.saved ?? preview.rows.length}.`);
      await onSaved();
    } catch {
      setNote('The server is not running. Start the database, then the app.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-medium text-slate-900">{spec.title}</p>
      <p className="mt-1 text-sm text-slate-500">{spec.help}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => downloadTemplate(kind)}>Download template</button>
        <label className="cursor-pointer rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Choose Excel file
          <input className="hidden" type="file" accept=".xlsx,.xls" onChange={onFile} />
        </label>
      </div>
      {savedNote && <p className="mt-3 text-sm text-teal-800">{savedNote}</p>}
      {note && <p className="mt-3 text-sm text-red-700">{note}</p>}
      {preview && (
        <div className="mt-3">
          <p className="text-sm text-slate-700">{preview.filename}: {preview.rows.length} ready{preview.errors.length > 0 ? `, ${preview.errors.length} to fix` : ''}.</p>
          {preview.errors.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-auto text-sm text-red-700">
              {preview.errors.map((item) => (
                <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>
              ))}
            </ul>
          )}
          {preview.rows.length > 0 && preview.errors.length === 0 && (
            <button type="button" className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60" disabled={busy} onClick={onSave}>
              {busy ? 'Saving…' : `Save ${preview.rows.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
