export function BankField({ id, banks, value, onChange }) {
  return (
    <div id={id} role="tabpanel" aria-label="Bank" className="rounded-b border border-t-0 border-slate-300 p-4">
      <p className="text-sm font-medium text-slate-900">Bank</p>
      <label className="mt-3 block text-sm text-slate-600">
        Bank name
        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose a bank</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.name}>{bank.name}</option>
          ))}
        </select>
        {banks.length === 0 && <span className="mt-1 block text-xs text-slate-500">Add the bank in Settings first.</span>}
      </label>
    </div>
  );
}
