
import React, { useState } from "react";

const NoteEditor = ({ initialNote = "", onSave, loading = false }) => {
  const [note, setNote] = useState(initialNote);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(note);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm"
    >
      <h2 className="text-xl font-bold text-purple-800 mb-4">
        Session Notes
      </h2>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write your session notes here..."
        rows={8}
        className="w-full p-4 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
      />

      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-500">
          {note.length} characters
        </span>

        <button
          type="submit"
          disabled={loading || !note.trim()}
          className="bg-purple-700 text-white px-6 py-2.5 rounded-xl hover:bg-purple-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Notes"}
        </button>
      </div>
    </form>
  );
};

export default NoteEditor;
