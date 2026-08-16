"use client";

const MAX_LENGTH = 4000;

export default function PromptEditor({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
}) {
  const overLimit = value.length > MAX_LENGTH;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-range-dim">{label}</label>
        <span className={`text-xs font-mono ${overLimit ? "text-range-red" : "text-range-dim/60"}`}>
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        spellCheck={false}
        className="w-full resize-y rounded-md border border-range-line bg-range-panel p-3 font-mono text-sm text-range-text placeholder:text-range-dim/50 focus:border-range-brass/50 focus:outline-none focus:ring-1 focus:ring-range-brass/30"
      />
    </div>
  );
}
