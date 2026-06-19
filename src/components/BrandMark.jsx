import { Orbit } from "lucide-react";

export function BrandMark({ compact = false }) {
  return (
    <header className="brand-mark" data-compact={compact ? "true" : "false"} aria-label="Solaris Atlas">
      <div className="brand-orbit" aria-hidden="true">
        <Orbit size={36} strokeWidth={1.45} />
      </div>
      <div className="brand-copy">
        <p>Solaris Atlas</p>
        <h1>太阳系漫游</h1>
      </div>
    </header>
  );
}
