import { useState } from "react";

export default function SearchFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({ topic: "", level: "", time: "" });

  const handleChange = (e) => {
    const updated = { ...filters, [e.target.name]: e.target.value };
    setFilters(updated);
    onFilterChange(updated);
  };

  return (
    <div className="flex gap-4 mb-6 justify-center">
      <select name="topic" onChange={handleChange} className="p-2 border rounded-lg">
        <option value="">Topic</option>
        <option value="AI">AI</option>
        <option value="ML">Machine Learning</option>
        <option value="Web">Web Dev</option>
      </select>

      <select name="level" onChange={handleChange} className="p-2 border rounded-lg">
        <option value="">Level</option>
        <option value="beginner">Beginner</option>
        <option value="advanced">Advanced</option>
      </select>

      <select name="time" onChange={handleChange} className="p-2 border rounded-lg">
        <option value="">Time</option>
        <option value="morning">Morning</option>
        <option value="afternoon">Afternoon</option>
      </select>
    </div>
  );
}
