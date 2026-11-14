
import React, { useState } from "react";

const SoapTemplate = ({ onSave, loading = false }) => {
  const [form, setForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(form);
  };

  const fields = [
    {
      name: "subjective",
      label: "S - Subjective",
      placeholder: "What did the client report?",
    },
    {
      name: "objective",
      label: "O - Objective",
      placeholder: "What did you observe?",
    },
    {
      name: "assessment",
      label: "A - Assessment",
      placeholder: "Your clinical assessment...",
    },
    {
      name: "plan",
      label: "P - Plan",
      placeholder: "Next steps and treatment plan...",
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm"
    >
      <h2 className="text-xl font-bold text-purple-800 mb-6">
        SOAP Session Notes
      </h2>

      <div className="space-y-5">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block font-semibold text-purple-800 mb-2">
              {field.label}
            </label>

            <textarea
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              rows={3}
              className="w-full p-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full bg-purple-700 text-white py-3 rounded-xl hover:bg-purple-800 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save SOAP Notes"}
      </button>
    </form>
  );
};

export default SoapTemplate;
