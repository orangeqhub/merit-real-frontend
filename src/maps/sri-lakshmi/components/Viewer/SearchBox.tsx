import { useState, type ChangeEvent } from "react";

import "./SearchBox.css";

interface Props {
  onSearch?: (query: string) => void;
  onClear?: () => void;
}

function normalizeQuery(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

export default function SearchBox({ onSearch, onClear }: Props) {
  const [value, setValue] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    const query = normalizeQuery(next);
    if (!query) {
      onClear?.();
      return;
    }
    onSearch?.(query);
  };

  return (
    <div className="search-box">
      <input
        placeholder="Search Plot..."
        value={value}
        onChange={handleChange}
        inputMode="numeric"
        autoComplete="off"
      />
    </div>
  );
}
