
import { useEffect, useState } from "react";
import {
  FileText, Search, Trash2, Pencil, X, Save,
  ClipboardList, UserRound, ArrowLeft, Lock, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

const emptySOAP = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

function Notes() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [noteMode, setNoteMode] = useState("general");
  const [noteType, setNoteType] = useState("general");
  const [visibility, setVisibility] = useState("private");
  const [content, setContent] = useState("");
  const [soap, setSoap] = useState(emptySOAP);

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const inputClass =
    "w-full rounded-xl border border-[#E4E8DF] bg-[#FBFCF8] p-3 text-sm text-[#405448] outline-none transition focus:border-[#91A994] focus:ring-2 focus:ring-[#91A994]/15";

  // FETCH CLIENTS
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axiosInstance.get("/clients");
        const clientList = response.data.clients || [];

        setClients(clientList);

        if (clientList.length > 0) {
          setSelectedClient(clientList[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load clients.");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // FETCH NOTES
  const fetchNotes = async (clientId = selectedClient) => {
    if (!clientId) {
      setNotes([]);
      return;
    }

    try {
      const response = await axiosInstance.get(
        `/notes/client/${clientId}`
      );
      setNotes(response.data.notes || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load notes.");
    }
  };

  useEffect(() => {
    fetchNotes(selectedClient);
  }, [selectedClient]);

  // RESET FORM
  const resetForm = () => {
    setContent("");
    setSoap(emptySOAP);
    setNoteMode("general");
    setNoteType("general");
    setVisibility("private");
    setEditingId(null);
  };

  // CHANGE FORMAT
  const changeFormat = (format) => {
    setNoteMode(format);

    if (format === "soap" || format === "dap") {
      setNoteType(format);
    } else {
      setNoteType("general");
    }

    setContent("");
    setSoap(emptySOAP);
  };

  // PREPARE NOTE CONTENT
  const getNoteContent = () => {
    if (noteMode === "general") {
      return content.trim();
    }

    if (noteMode === "soap") {
      return [
        "SUBJECTIVE:",
        soap.subjective,
        "",
        "OBJECTIVE:",
        soap.objective,
        "",
        "ASSESSMENT:",
        soap.assessment,
        "",
        "PLAN:",
        soap.plan,
      ].join("\n").trim();
    }

    return [
      "DATA / SUBJECTIVE:",
      soap.subjective,
      "",
      "ASSESSMENT:",
      soap.assessment,
      "",
      "PLAN:",
      soap.plan,
    ].join("\n").trim();
  };

  // SAVE NOTE
  const handleSave = async (e) => {
    e.preventDefault();

    const finalContent = getNoteContent();

    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }

    if (!finalContent) {
      setError("Please enter some note content.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        client: selectedClient,
        content: finalContent,
        noteType,
        visibility,
      };

      if (editingId) {
        await axiosInstance.put(`/notes/${editingId}`, payload);
        setSuccess("Note updated successfully.");
      } else {
        await axiosInstance.post("/notes", payload);
        setSuccess("Note saved successfully.");
      }

      await fetchNotes(selectedClient);
      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  // EDIT NOTE
  const handleEdit = (note) => {
    setEditingId(note._id);
    setNoteType(note.noteType || "general");
    setVisibility(note.visibility || "private");

    // Existing note content is preserved when editing.
    setNoteMode("general");
    setContent(note.content || "");
    setSoap(emptySOAP);

    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // DELETE NOTE
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      setError("");
      await axiosInstance.delete(`/notes/${id}`);

      setNotes((previous) =>
        previous.filter((note) => note._id !== id)
      );

      if (editingId === id) resetForm();

      setSuccess("Note deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete note."
      );
    }
  };

  const filteredNotes = notes.filter((note) =>
    note.content?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClientName =
    clients.find((client) => client._id === selectedClient)?.name ||
    "Selected client";

  const isStructured = noteMode === "soap" || noteMode === "dap";

  return (
    <div className="min-h-screen bg-[#F7F7F0] text-[#35483C]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/therapist/dashboard")}
              className="mb-5 flex items-center gap-2 text-sm text-[#829084] transition hover:text-[#58735F]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E4EBDF] p-3 text-[#66816A]">
                <FileText size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Session Notes
                </h1>
                <p className="mt-1 text-sm text-[#879187]">
                  A thoughtful space for every client's progress.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-full border border-[#E5E8DF] bg-white px-4 py-2 text-sm text-[#829084]">
            <span className="font-semibold text-[#64816A]">
              {notes.length}
            </span>{" "}
            Notes saved
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-5 rounded-xl border border-[#F0D7D0] bg-[#FFF2ED] px-4 py-3 text-sm text-[#B66E5F]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-[#DCE9DA] bg-[#EEF5EB] px-4 py-3 text-sm text-[#58775D]">
            {success}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-[#829084]">
            Loading your clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E8DF] bg-white p-10 text-center">
            <UserRound size={35} className="mx-auto mb-3 text-[#9BAE99]" />
            <h2 className="font-semibold">No clients yet</h2>
            <p className="mt-2 text-sm text-[#879187]">
              Add a client before creating session notes.
            </p>
            <button
              onClick={() => navigate("/therapist/clients")}
              className="mt-5 rounded-xl bg-[#718B73] px-5 py-2.5 text-sm font-medium text-white"
            >
              Go to Clients
            </button>
          </div>
        ) : (
          <>
            {/* CLIENT SELECTOR */}
            <div className="mb-6 rounded-2xl border border-[#E5E8DF] bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-medium">
                Select client
              </label>

              <select
                value={selectedClient}
                onChange={(e) => {
                  resetForm();
                  setSelectedClient(e.target.value);
                }}
                className={`${inputClass} md:max-w-md`}
              >
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

              {/* CREATE NOTE */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-[#E5E8DF] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="font-semibold">
                      {editingId ? "Edit note" : "Create a note"}
                    </h2>
                    <ClipboardList size={20} className="text-[#91A994]" />
                  </div>

                  <form onSubmit={handleSave}>
                    <label className="mb-2 block text-sm font-medium">
                      Note format
                    </label>

                    <div className="mb-5 grid grid-cols-3 gap-2">
                      {[
                        ["general", "General"],
                        ["soap", "SOAP"],
                        ["dap", "DAP"],
                      ].map(([format, label]) => (
                        <button
                          key={format}
                          type="button"
                          disabled={!!editingId}
                          onClick={() => changeFormat(format)}
                          className={`rounded-xl border px-2 py-2.5 text-sm transition ${
                            noteMode === format
                              ? "border-[#91A994] bg-[#EDF3E9] font-medium text-[#58735F]"
                              : "border-[#E5E8DF] text-[#829084] hover:bg-[#F8F9F5]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* GENERAL CATEGORY */}
                    {noteMode === "general" && (
                      <>
                        <label className="mb-2 block text-sm font-medium">
                          Category
                        </label>

                        <select
                          value={noteType}
                          onChange={(e) => setNoteType(e.target.value)}
                          className={`${inputClass} mb-5`}
                        >
                          <option value="general">General</option>
                          <option value="session">Session</option>
                          <option value="progress">Progress</option>
                        </select>
                      </>
                    )}

                    {/* VISIBILITY */}
                    <label className="mb-2 block text-sm font-medium">
                      Note visibility
                    </label>

                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                      className={`${inputClass} mb-3`}
                    >
                      <option value="private">
                        Private — Only I can see this
                      </option>
                      <option value="shared">
                        Shared — Client can see this
                      </option>
                    </select>

                    <div className="mb-5 rounded-xl bg-[#F8F9F5] p-3">
                      {visibility === "private" ? (
                        <p className="flex items-center gap-2 text-xs text-[#748174]">
                          <Lock size={15} />
                          This note is visible only to you.
                        </p>
                      ) : (
                        <p className="flex items-center gap-2 text-xs text-[#58735F]">
                          <Users size={15} />
                          This note will be visible in the client's portal.
                        </p>
                      )}
                    </div>

                    {/* GENERAL CONTENT */}
                    {noteMode === "general" && (
                      <>
                        <label className="mb-2 block text-sm font-medium">
                          Note content
                        </label>

                        <textarea
                          rows={9}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Write your observations, thoughts and session details..."
                          className={`${inputClass} resize-y leading-6`}
                        />
                      </>
                    )}

                    {/* SOAP / DAP FIELDS */}
                    {isStructured && (
                      <div className="space-y-4">
                        {[
                          [
                            "subjective",
                            noteMode === "soap"
                              ? "S – Subjective"
                              : "D – Data",
                            "What does the client report?",
                          ],
                          ...(noteMode === "soap"
                            ? [[
                                "objective",
                                "O – Objective",
                                "What did you observe?",
                              ]]
                            : []),
                          [
                            "assessment",
                            noteMode === "soap"
                              ? "A – Assessment"
                              : "A – Assessment",
                            "Your professional assessment...",
                          ],
                          [
                            "plan",
                            "P – Plan",
                            "Next steps and treatment plan...",
                          ],
                        ].map(([key, label, placeholder]) => (
                          <div key={key}>
                            <label className="mb-2 block text-sm font-medium">
                              {label}
                            </label>
                            <textarea
                              rows={3}
                              value={soap[key]}
                              onChange={(e) =>
                                setSoap((previous) => ({
                                  ...previous,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={placeholder}
                              className={`${inputClass} resize-y`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SAVE */}
                    <div className="mt-5 flex gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#718B73] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#5F785F] disabled:opacity-60"
                      >
                        <Save size={16} />
                        {saving
                          ? "Saving..."
                          : editingId
                          ? "Update note"
                          : "Save note"}
                      </button>

                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="rounded-xl border border-[#E4E8DF] px-4 text-[#829084]"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* SAVED NOTES */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-[#E5E8DF] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Saved notes</h2>
                      <p className="mt-1 text-sm text-[#879187]">
                        Notes for {selectedClientName}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#EDF3E9] px-3 py-1 text-xs font-medium text-[#64816A]">
                      {filteredNotes.length} entries
                    </span>
                  </div>

                  {/* SEARCH */}
                  <div className="relative mb-5">
                    <Search
                      size={17}
                      className="absolute left-3 top-3 text-[#9BA69B]"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search notes..."
                      className={`${inputClass} pl-10`}
                    />
                  </div>

                  {/* NOTES */}
                  {filteredNotes.length === 0 ? (
                    <div className="rounded-xl bg-[#F8F9F5] px-5 py-12 text-center">
                      <FileText
                        size={30}
                        className="mx-auto mb-3 text-[#A7B5A3]"
                      />
                      <p className="text-sm font-medium">
                        No notes found
                      </p>
                      <p className="mt-1 text-xs text-[#929D91]">
                        Your saved notes will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredNotes.map((note) => (
                        <div
                          key={note._id}
                          className="rounded-xl border border-[#E8EBE3] bg-[#FDFDF9] p-4 transition hover:border-[#C6D4C2]"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#EDF3E9] px-3 py-1 text-xs font-medium capitalize text-[#64816A]">
                                {note.noteType || "general"}
                              </span>

                              <span
                                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                                  note.visibility === "shared"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {note.visibility === "shared" ? (
                                  <Users size={12} />
                                ) : (
                                  <Lock size={12} />
                                )}
                                {note.visibility === "shared"
                                  ? "Shared with client"
                                  : "Private"}
                              </span>
                            </div>

                            <span className="text-xs text-[#929D91]">
                              {new Date(note.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#59675B]">
                            {note.content}
                          </p>

                          <div className="mt-4 flex justify-end gap-2 border-t border-[#EDF0E9] pt-3">
                            <button
                              onClick={() => handleEdit(note)}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-[#64816A] transition hover:bg-[#EDF3E9]"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(note._id)}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-[#B87566] transition hover:bg-[#FFF0EA]"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Notes;
