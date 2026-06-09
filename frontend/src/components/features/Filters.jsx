import { useState } from "react";

export default function Filters({ talks = [], setFiltered }) {
  const [keyword, setKeyword] = useState("");

  const handleFilter = () => {
    const filtered = talks.filter((t) => {
      const title = t?.title || "";
      return title.toLowerCase().includes(keyword.toLowerCase());
    });
    setFiltered(filtered);
  };

  return (
    <div className="flex gap-4 mb-6">
      <input
        className="border p-2 rounded-lg"
        placeholder="Filter talks..."
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button
        onClick={handleFilter}
        className="bg-blue-500 text-white px-4 rounded-lg"
      >
        Apply
      </button>
    </div>
  );
}
