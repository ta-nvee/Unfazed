
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import UpgradePrompt from "../../components/common/UpgradePrompt";
import "./Clients.css";

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [tagFilter, setTagFilter] = useState("all");
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [showForm, setShowForm] = useState(false);
  const [invitationToken, setInvitationToken] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");

  const [intake, setIntake] = useState(null);
  const [consentRecords, setConsentRecords] = useState([]);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState("");

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
  });

  // Fetch all clients
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("/clients");
      const data = response.data;

      setClients(
        Array.isArray(data)
          ? data
          : data.clients || data.data || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load clients."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Add client form
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Add client
  const handleAddClient = async (e) => {
    e.preventDefault();
    setError("");
    setInvitationToken("");
    setCopyMessage("");

    try {
      const response = await axiosInstance.post("/clients", formData);
      const token = response.data?.invitation?.token;

      if (token) {
        setInvitationToken(token);
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
      });

      setShowForm(false);
      await fetchClients();
    } catch (err) {
      const message =
        err.response?.data?.message || "Unable to add client.";

      if (
        err.response?.status === 403 &&
        /limit|upgrade|plan|subscription/i.test(message)
      ) {
        setUpgradeMessage(message);
        setShowUpgradePrompt(true);
        return;
      }

      setError(message);
    }
  };

  // Copy invitation token
  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(invitationToken);
      setCopyMessage("Invitation token copied!");
    } catch {
      setCopyMessage(
        "Copy failed. Please select and copy the token manually."
      );
    }
  };

  // Fetch notes
  const fetchClientNotes = async (clientId) => {
    try {
      setNotesLoading(true);
      setNotesError("");

      const response = await axiosInstance.get(
        `/notes/client/${clientId}`
      );

      setNotes(response.data.notes || []);
    } catch (err) {
      setNotesError(
        err.response?.data?.message || "Unable to load client notes."
      );
    } finally {
      setNotesLoading(false);
    }
  };

  // View client details
  const handleViewDetails = async (id) => {
    try {
      setError("");

      setSessions([]);
      setSessionsError("");
      setIntake(null);
      setConsentRecords([]);
      setIntakeError("");
      setPayments([]);
      setPaymentsError("");
      setNotes([]);
      setNotesError("");
      setNoteContent("");
      setNoteType("general");
      setEditingNoteId(null);

      setSessionsLoading(true);
      setIntakeLoading(true);
      setPaymentsLoading(true);

      const response = await axiosInstance.get(`/clients/${id}`);
      const client = response.data.client;

      setSelectedClient(client);
      setTagInput((client.tags || []).join(", "));
      setShowDetails(true);
      setEditingClient(false);

      try {
        const intakeResponse = await axiosInstance.get(
          `/clients/${id}/intake`
        );

        setIntake(intakeResponse.data.intake || {});
        setConsentRecords(
          intakeResponse.data.consentRecords || []
        );
      } catch (intakeErr) {
        if (intakeErr.response?.status === 404) {
          setIntakeError(
            "This client has not submitted an intake form yet."
          );
        } else {
          setIntakeError(
            intakeErr.response?.data?.message ||
              "Unable to load intake details."
          );
        }
      } finally {
        setIntakeLoading(false);
      }

      try {
        const paymentResponse = await axiosInstance.get(
          `/payments?clientId=${id}`
        );

        setPayments(paymentResponse.data.payments || []);
      } catch (paymentErr) {
        setPaymentsError(
          paymentErr.response?.data?.message ||
            "Unable to load payment history."
        );
      } finally {
        setPaymentsLoading(false);
      }

      await fetchClientNotes(id);

      try {
        const sessionsResponse = await axiosInstance.get(
          `/clients/${id}/sessions`
        );

        const sessionsData = sessionsResponse.data;

        setSessions(
          Array.isArray(sessionsData)
            ? sessionsData
            : sessionsData.sessions || []
        );
      } catch (sessionErr) {
        setSessionsError(
          sessionErr.response?.data?.message ||
            "Unable to load session history."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load client details."
      );
    } finally {
      setSessionsLoading(false);
      setIntakeLoading(false);
      setPaymentsLoading(false);
    }
  };

  // Save client tags
  const handleSaveTags = async () => {
    if (!selectedClient?._id) return;

    const tags = [
      ...new Set(
        tagInput
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (tags.length > 10) {
      setError("A client can have a maximum of 10 tags.");
      return;
    }

    if (tags.some((tag) => tag.length > 30)) {
      setError("Each tag can contain a maximum of 30 characters.");
      return;
    }

    try {
      setSavingTags(true);
      setError("");

      const response = await axiosInstance.put(
        `/clients/${selectedClient._id}/tags`,
        { tags }
      );

      const updatedTags =
        response.data?.client?.tags ||
        response.data?.tags ||
        tags;

      setSelectedClient((previous) => ({
        ...previous,
        tags: updatedTags,
      }));

      setTagInput(updatedTags.join(", "));
      await fetchClients();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update client tags."
      );
    } finally {
      setSavingTags(false);
    }
  };

  // Add or update note
  const handleSaveNote = async (e) => {
    e.preventDefault();

    if (!noteContent.trim()) {
      setNotesError("Please enter note content.");
      return;
    }

    if (!selectedClient?._id) return;

    try {
      setSavingNote(true);
      setNotesError("");

      if (editingNoteId) {
        await axiosInstance.put(`/notes/${editingNoteId}`, {
          content: noteContent,
          noteType,
        });
      } else {
        await axiosInstance.post("/notes", {
          client: selectedClient._id,
          content: noteContent,
          noteType,
        });
      }

      setNoteContent("");
      setNoteType("general");
      setEditingNoteId(null);

      await fetchClientNotes(selectedClient._id);
    } catch (err) {
      setNotesError(
        err.response?.data?.message || "Unable to save note."
      );
    } finally {
      setSavingNote(false);
    }
  };

  // Edit note
  const handleEditNote = (note) => {
    setEditingNoteId(note._id);
    setNoteContent(note.content || "");
    setNoteType(note.noteType || "general");
    setNotesError("");
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) return;

    try {
      setNotesError("");

      await axiosInstance.delete(`/notes/${noteId}`);

      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteContent("");
        setNoteType("general");
      }

      await fetchClientNotes(selectedClient._id);
    } catch (err) {
      setNotesError(
        err.response?.data?.message || "Unable to delete note."
      );
    }
  };

  // Start editing client
  const handleStartEdit = () => {
    setEditData({
      name: selectedClient.name || "",
      email: selectedClient.email || "",
      phone: selectedClient.phone || "",
      status: selectedClient.status || "active",
    });

    setEditingClient(true);
  };

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  // Update client
  const handleUpdateClient = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const id = selectedClient._id;

      const response = await axiosInstance.put(
        `/clients/${id}`,
        editData
      );

      setSelectedClient(response.data.client);
      setEditingClient(false);

      await fetchClients();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update client."
      );
    } finally {
      setSaving(false);
    }
  };

  // Close profile modal
  const closeDetails = () => {
    setShowDetails(false);
    setEditingClient(false);
    setSelectedClient(null);
    setTagInput("");
    setSessions([]);
    setSessionsError("");
    setSessionsLoading(false);
    setIntake(null);
    setConsentRecords([]);
    setIntakeError("");
    setIntakeLoading(false);
    setPayments([]);
    setPaymentsError("");
    setPaymentsLoading(false);
    setNotes([]);
    setNotesError("");
    setNotesLoading(false);
    setNoteContent("");
    setNoteType("general");
    setEditingNoteId(null);
  };

  // Delete client
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this client?"
    );

    if (!confirmDelete) return;

    try {
      await axiosInstance.delete(`/clients/${id}`);

      if (selectedClient?._id === id) {
        closeDetails();
      }

      await fetchClients();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete client."
      );
    }
  };

  // Search, filter and sort
  const filteredClients = clients
    .filter((client) => {
      const searchText =
        `${client.name || ""} ${client.email || ""}`.toLowerCase();

      const matchesSearch = searchText.includes(
        search.toLowerCase()
      );

      const clientStatus = (
        client.status || "active"
      ).toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        clientStatus === statusFilter;

      const clientTags = client.tags || [];

      const matchesTag =
        tagFilter === "all" ||
        clientTags.includes(tagFilter);

      return matchesSearch && matchesStatus && matchesTag;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === "name-desc") {
        return (b.name || "").localeCompare(a.name || "");
      }

      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      if (sortBy === "oldest") return dateA - dateB;

      return dateB - dateA;
    });

  const now = new Date();

  const upcomingSessions = sessions.filter((session) => {
    const isFuture = new Date(session.startTime) >= now;

    const isCancelled = ["cancelled", "no-show"].includes(
      (session.status || "").toLowerCase()
    );

    return isFuture && !isCancelled;
  });

  const pastSessions = sessions.filter(
    (session) => !upcomingSessions.includes(session)
  );

  const latestConsent =
    consentRecords.length > 0
      ? [...consentRecords].sort(
          (a, b) =>
            new Date(b.acceptedAt || 0) -
            new Date(a.acceptedAt || 0)
        )[0]
      : null;

  const formatSessionDate = (dateValue) => {
    if (!dateValue) return "Date not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatSessionTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatPaymentDate = (dateValue) => {
    if (!dateValue) return "Date not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderSessionCard = (session) => (
    <div
      key={session._id}
      className="border border-[#e5ebe3] rounded-xl p-4 bg-white"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div>
          <p className="font-semibold text-gray-800">
            {formatSessionDate(session.startTime)}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {formatSessionTime(session.startTime)}
            {session.endTime
              ? ` – ${formatSessionTime(session.endTime)}`
              : ""}
          </p>
        </div>

        <span className="self-start px-3 py-1 rounded-full text-xs font-medium bg-[#edf2ec] text-[#607c68] capitalize">
          {(session.status || "scheduled").replace("-", " ")}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-gray-600">
        <span>
          Type:{" "}
          <strong className="font-medium text-gray-800">
            {session.sessionType === "in-person"
              ? "In-person"
              : "Online"}
          </strong>
        </span>

        <span>
          Fee:{" "}
          <strong className="font-medium text-gray-800">
            {typeof session.fee === "number"
              ? `₹${session.fee.toLocaleString("en-IN")}`
              : "—"}
          </strong>
        </span>
      </div>
    </div>
  );

  const renderIntakeField = (label, value) => (
    <div key={label} className="bg-[#f5f7f2] rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800 mt-1 whitespace-pre-wrap">
        {value || "Not provided"}
      </p>
    </div>
  );

  return (
    <div className="clients-page min-h-screen">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#607c68]">
          Unfazed
        </h1>

        <button
          onClick={() =>
            (window.location.href = "/therapist/dashboard")
          }
          className="text-[#607c68] font-medium hover:underline"
        >
          Back to Dashboard
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Clients
            </h2>
            <p className="text-gray-500 mt-1">
              Manage your therapy clients and their profiles.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#607c68] text-white px-5 py-3 rounded-xl hover:bg-[#4d6855]"
          >
            {showForm ? "Cancel" : "+ Add Client"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </p>
        )}

        {/* Invitation token */}
        {invitationToken && (
          <div className="bg-white border border-[#d8e3d9] rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-[#607c68] mb-2">
              Client invitation created!
            </h3>

            <p className="text-gray-600 text-sm mb-3">
              Share this token securely with your client.
              They need it to register their account.
              It expires in 7 days.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                readOnly
                value={invitationToken}
                className="flex-1 border rounded-lg p-3 text-sm bg-gray-50"
              />

              <button
                onClick={handleCopyToken}
                className="bg-[#607c68] text-white px-5 py-3 rounded-lg"
              >
                Copy Token
              </button>
            </div>

            {copyMessage && (
              <p className="text-sm text-green-700 mt-3">
                {copyMessage}
              </p>
            )}

            <button
              onClick={() => {
                setInvitationToken("");
                setCopyMessage("");
              }}
              className="text-gray-500 text-sm mt-4 hover:underline"
            >
              Close
            </button>
          </div>
        )}

        {/* Add client form */}
        {showForm && (
          <form
            onSubmit={handleAddClient}
            className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Client name"
              className="border rounded-lg p-3"
              required
            />

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Client email"
              className="border rounded-lg p-3"
              required
            />

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone number"
              className="border rounded-lg p-3"
            />

            <button
              type="submit"
              className="md:col-span-3 bg-[#607c68] text-white py-3 rounded-lg hover:bg-[#4d6855]"
            >
              Save Client
            </button>
          </form>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Total Clients</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">
              {clients.length}
            </h3>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Active Clients</p>
            <h3 className="text-3xl font-bold text-[#607c68] mt-1">
              {clients.filter(
                (c) =>
                  (c.status || "active").toLowerCase() === "active"
              ).length}
            </h3>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-gray-500 text-sm">Inactive Clients</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">
              {clients.filter(
                (c) =>
                  (c.status || "").toLowerCase() === "inactive"
              ).length}
            </h3>
          </div>
        </div>

        {/* Search, filter and sort */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full border border-[#dce5dc] rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#a7b9a9]"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-[#dce5dc] rounded-lg p-3 bg-white"
            >
              <option value="all">All Clients</option>
              <option value="active">Active Clients</option>
              <option value="inactive">Inactive Clients</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full border border-[#dce5dc] rounded-lg p-3 bg-white"
            >
              <option value="all">All Tags</option>

              {[...new Set(
                clients.flatMap((client) => client.tags || [])
              )]
                .sort()
                .map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-[#dce5dc] rounded-lg p-3 bg-white"
            >
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest Added</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
            </select>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Showing {filteredClients.length} of {clients.length} clients
          </p>
        </div>

        {/* Clients table */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-gray-500">
              Loading clients...
            </p>
          ) : filteredClients.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No clients found.
            </p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#edf2ec]">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Tags</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client._id || client.id}
                    className="border-t hover:bg-[#fafbf8]"
                  >
                    <td className="p-4 font-medium text-gray-800">
                      {client.name}
                    </td>

                    <td className="p-4">{client.email || "—"}</td>
                    <td className="p-4">{client.phone || "—"}</td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          client.status === "inactive"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {client.status || "active"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(client.tags || []).length > 0 ? (
                          client.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 rounded-full bg-[#edf2ec] text-[#607c68] text-xs"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleViewDetails(client._id || client.id)
                          }
                          className="text-[#607c68] font-medium hover:underline"
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(client._id || client.id)
                          }
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Client profile modal */}
      {showDetails && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Client Profile
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Client information and account details
                </p>
              </div>

              <button
                onClick={closeDetails}
                className="text-gray-500 text-2xl hover:text-gray-800"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Edit client form */}
            {editingClient ? (
              <form onSubmit={handleUpdateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    required
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={editData.phone}
                    onChange={handleEditChange}
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={editData.status}
                    onChange={handleEditChange}
                    className="w-full border rounded-lg p-3"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#607c68] text-white py-3 rounded-lg disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingClient(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Client information */}
                <div className="space-y-4">
                  {[
                    ["Full Name", selectedClient.name],
                    ["Email Address", selectedClient.email],
                    ["Phone Number", selectedClient.phone],
                    ["Status", selectedClient.status],
                    [
                      "Account Created",
                      selectedClient.accountCreatedAt
                        ? new Date(
                            selectedClient.accountCreatedAt
                          ).toLocaleDateString()
                        : "Account not registered yet",
                    ],
                    [
                      "Client Added",
                      selectedClient.createdAt
                        ? new Date(
                            selectedClient.createdAt
                          ).toLocaleDateString()
                        : "—",
                    ],
                  ].map(([label, value]) =>
                    renderIntakeField(label, value)
                  )}
                </div>

                {/* Client tags */}
                <section className="mt-7">
                  <h4 className="text-lg font-bold text-gray-800 mb-3">
                    Client Tags
                  </h4>

                  <p className="text-sm text-gray-500 mb-3">
                    Add labels to organize your clients.
                    Separate multiple tags with commas.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(selectedClient.tags || []).length > 0 ? (
                      selectedClient.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full bg-[#edf2ec] text-[#607c68] text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">
                        No tags added yet.
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Example: anxiety, priority, follow-up"
                    className="w-full border border-[#dce5dc] rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#a7b9a9]"
                  />

                  <p className="text-xs text-gray-400 mt-2">
                    Maximum 10 tags. Each tag can contain up to 30 characters.
                  </p>

                  <button
                    type="button"
                    onClick={handleSaveTags}
                    disabled={savingTags}
                    className="mt-3 w-full bg-[#607c68] text-white py-3 rounded-lg hover:bg-[#4d6855] disabled:opacity-50"
                  >
                    {savingTags ? "Saving Tags..." : "Save Tags"}
                  </button>
                </section>

                {/* Intake details */}
                <section className="mt-7">
                  <div className="flex justify-between items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      Client Intake Details
                    </h4>

                    {latestConsent?.accepted && (
                      <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Consent Accepted
                      </span>
                    )}
                  </div>

                  {intakeLoading ? (
                    <p className="text-sm text-gray-500 py-4">
                      Loading intake details...
                    </p>
                  ) : intakeError ? (
                    <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-xl p-4">
                      {intakeError}
                    </p>
                  ) : intake ? (
                    <div className="space-y-3">
                      {renderIntakeField(
                        "Date of Birth",
                        intake.dateOfBirth
                          ? new Date(
                              intake.dateOfBirth
                            ).toLocaleDateString()
                          : "Not provided"
                      )}

                      {[
                        ["Gender", intake.gender],
                        ["Occupation", intake.occupation],
                        ["Presenting Concern", intake.presentingConcern],
                        ["Relevant History", intake.relevantHistory],
                        [
                          "Emergency Contact Name",
                          intake.emergencyContact?.name,
                        ],
                        [
                          "Emergency Contact Phone",
                          intake.emergencyContact?.phone,
                        ],
                        [
                          "Emergency Contact Relationship",
                          intake.emergencyContact?.relationship,
                        ],
                        [
                          "Intake Completed At",
                          intake.completedAt
                            ? new Date(
                                intake.completedAt
                              ).toLocaleString()
                            : "Not completed",
                        ],
                      ].map(([label, value]) =>
                        renderIntakeField(label, value)
                      )}

                      <div className="bg-[#edf2ec] rounded-xl p-4">
                        <p className="font-semibold text-gray-800">
                          Digital Consent Record
                        </p>

                        <p className="text-sm text-gray-600 mt-2">
                          Status:{" "}
                          {latestConsent
                            ? latestConsent.accepted
                              ? "Accepted"
                              : "Not accepted"
                            : "No consent record"}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          Consent Version:{" "}
                          {latestConsent?.consentVersion || "—"}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          Accepted At:{" "}
                          {latestConsent?.acceptedAt
                            ? new Date(
                                latestConsent.acceptedAt
                              ).toLocaleString()
                            : "—"}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          Total Consent Records: {consentRecords.length}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>

                {/* Payment history */}
                <section className="mt-7">
                  <div className="flex justify-between items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      Payment History
                    </h4>

                    <span className="text-xs text-gray-500">
                      {payments.length} total
                    </span>
                  </div>

                  {paymentsLoading ? (
                    <p className="text-sm text-gray-500 py-4">
                      Loading payment history...
                    </p>
                  ) : paymentsError ? (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                      {paymentsError}
                    </p>
                  ) : payments.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-xl p-4">
                      No payments recorded for this client yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment._id}
                          className="border border-[#e5ebe3] rounded-xl p-4 bg-white"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="text-xl font-bold text-gray-800">
                                {payment.currency === "INR" ? "₹" : ""}
                                {Number(payment.amount).toLocaleString("en-IN")}
                                {payment.currency !== "INR"
                                  ? ` ${payment.currency}`
                                  : ""}
                              </p>

                              <p className="text-sm text-gray-500 mt-1">
                                {formatPaymentDate(
                                  payment.paidAt || payment.createdAt
                                )}
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                payment.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : payment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {payment.status || "unknown"}
                            </span>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Payment ID
                            </p>

                            <p className="text-sm text-gray-700 break-all mt-1">
                              {payment.razorpayPaymentId ||
                                payment.razorpayOrderId ||
                                "Not available"}
                            </p>

                            {payment.session && (
                              <p className="text-xs text-gray-500 mt-2">
                                Session:{" "}
                                {payment.session.startTime
                                  ? formatPaymentDate(
                                      payment.session.startTime
                                    )
                                  : "Linked"}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Client notes */}
                <section className="mt-7">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      Client Notes
                    </h4>

                    <span className="text-xs text-gray-500">
                      {notes.length} total
                    </span>
                  </div>

                  <form
                    onSubmit={handleSaveNote}
                    className="bg-[#f5f7f2] rounded-xl p-4 space-y-3"
                  >
                    <h5 className="font-semibold text-gray-700">
                      {editingNoteId ? "Edit Note" : "Add New Note"}
                    </h5>

                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full border border-[#dce5dc] rounded-lg p-3 bg-white"
                    >
                      <option value="general">General Note</option>
                      <option value="session">Session Note</option>
                      <option value="progress">Progress Note</option>
                    </select>

                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Write your client note here..."
                      rows={4}
                      className="w-full border border-[#dce5dc] rounded-lg p-3 bg-white resize-y"
                      required
                    />

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={savingNote}
                        className="flex-1 bg-[#607c68] text-white py-3 rounded-lg disabled:opacity-50"
                      >
                        {savingNote
                          ? "Saving..."
                          : editingNoteId
                          ? "Update Note"
                          : "Save Note"}
                      </button>

                      {editingNoteId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(null);
                            setNoteContent("");
                            setNoteType("general");
                          }}
                          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {notesError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mt-3">
                      {notesError}
                    </p>
                  )}

                  <div className="mt-4 space-y-3">
                    {notesLoading ? (
                      <p className="text-sm text-gray-500 py-3">
                        Loading notes...
                      </p>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-xl p-4">
                        No notes added for this client yet.
                      </p>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note._id}
                          className="border border-[#e5ebe3] rounded-xl p-4"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <span className="text-xs font-medium capitalize px-3 py-1 rounded-full bg-[#edf2ec] text-[#607c68]">
                              {(note.noteType || "general").replace("-", " ")}
                            </span>

                            <span className="text-xs text-gray-500">
                              {note.createdAt
                                ? new Date(note.createdAt).toLocaleDateString()
                                : ""}
                            </span>
                          </div>

                          <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                            {note.content}
                          </p>

                          <div className="flex gap-4 mt-4">
                            <button
                              type="button"
                              onClick={() => handleEditNote(note)}
                              className="text-sm text-[#607c68] font-medium hover:underline"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note._id)}
                              className="text-sm text-red-600 font-medium hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Session history */}
                <section className="mt-7">
                  <div className="flex justify-between items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-gray-800">
                      Session History
                    </h4>

                    <span className="text-xs text-gray-500">
                      {sessions.length} total
                    </span>
                  </div>

                  {sessionsLoading ? (
                    <p className="text-sm text-gray-500 py-4">
                      Loading session history...
                    </p>
                  ) : sessionsError ? (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                      {sessionsError}
                    </p>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-xl p-4">
                      No sessions have been booked for this client yet.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-[#607c68]">
                            Upcoming Sessions
                          </h5>

                          <span className="text-xs text-gray-500">
                            {upcomingSessions.length}
                          </span>
                        </div>

                        {upcomingSessions.length > 0 ? (
                          <div className="space-y-3">
                            {upcomingSessions.map(renderSessionCard)}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-lg p-3">
                            No upcoming sessions.
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-700">
                            Past &amp; Cancelled Sessions
                          </h5>

                          <span className="text-xs text-gray-500">
                            {pastSessions.length}
                          </span>
                        </div>

                        {pastSessions.length > 0 ? (
                          <div className="space-y-3">
                            {pastSessions.map(renderSessionCard)}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 bg-[#f5f7f2] rounded-lg p-3">
                            No past sessions.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Profile actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleStartEdit}
                    className="flex-1 bg-[#607c68] text-white py-3 rounded-lg hover:bg-[#4d6855]"
                  >
                    Edit Profile
                  </button>

                  <button
                    onClick={closeDetails}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <UpgradePrompt
          message={upgradeMessage}
          onClose={() => setShowUpgradePrompt(false)}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            window.location.href = "/therapist/subscription";
          }}
        />
      )}
    </div>
  );
}

export default Clients;
