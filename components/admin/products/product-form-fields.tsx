// Shared form-field primitives used by the product/machine-page editors.
// Behavior-preserving extraction from ProductsMachinePagesView.tsx — no logic changes.

export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">{label}</div>
        {hint ? <div className="mt-1 text-xs leading-5 text-secondary">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}
