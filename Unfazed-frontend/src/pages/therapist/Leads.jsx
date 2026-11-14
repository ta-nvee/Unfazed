
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  ArrowLeft,
  X,
  Save,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  source: "other",
  status: "new",
  notes: "",
};

const statusColors = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  converted: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

function Leads() {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [convertingId, setConvertingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("/leads");
      setLeads(response.data.leads || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load leads."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) =>
      `${lead.name} ${lead.email} ${lead.phone}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [leads, search]);

  const updateField = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await axiosInstance.put(`/leads/${editingId}`, form);
        setSuccess("Lead updated successfully.");
      } else {
        await axiosInstance.post("/leads", form);
        setSuccess("Lead added successfully.");
      }

      resetForm();
      await fetchLeads();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save lead."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead) => {
    setForm({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "other",
      status: lead.status || "new",
      notes: lead.notes || "",
    });

    setEditingId(lead._id);
    setShowForm(true);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      await axiosInstance.delete(`/leads/${id}`);

      setSuccess("Lead deleted successfully.");
      await fetchLeads();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete lead."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm("Convert this lead into a client?")) {
      return;
    }

    try {
      setConvertingId(id);
      setError("");
      setSuccess("");

      await axiosInstance.patch(`/leads/${id}/convert`);

      setSuccess("Lead successfully converted into a client.");
      await fetchLeads();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to convert lead."
      );
    } finally {
      setConvertingId(null);
    }
  };

  const stats = [
    { label: "Total Leads", value: leads.length },
    {
      label: "New",
      value: leads.filter((lead) => lead.status === "new").length,
    },
    {
      label: "Contacted",
      value: leads.filter((lead) => lead.status === "contacted").length,
    },
    {
      label: "Converted",
      value: leads.filter((lead) => lead.status === "converted").length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#39363D]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/therapist/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm text-[#827A89] hover:text-[#76618D]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E9E1F2] p-3 text-[#806A98]">
                <Users size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold">
                  Lead Management
                </h1>
                <p className="mt-1 text-sm text-[#8B8490]">
                  Keep track of people interested in your practice.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-[#E8E2EB] bg-white px-4 py-3 text-sm text-[#705A87] hover:bg-[#F5F0F8] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                setError("");
                setSuccess("");
              }}
              className="flex items-center gap-2 rounded-xl bg-[#806A98] px-4 py-3 text-sm font-medium text-white hover:bg-[#705987]"
            >
              <Plus size={17} />
              Add Lead
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Statistics */}
        <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#ECE7EF] bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-[#827A89]">{stat.label}</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {stat.value}
              </h2>
            </div>
          ))}
        </div>

        {/* Add / Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-7 rounded-2xl border border-[#ECE7EF] bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Lead" : "Add New Lead"}
              </h2>

              <button type="button" onClick={resetForm}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  required
                  placeholder="Enter lead name"
                  className="w-full rounded-xl border border-[#E8E2EB] px-4 py-3 outline-none focus:border-[#A995BE]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="Enter email address"
                  className="w-full rounded-xl border border-[#E8E2EB] px-4 py-3 outline-none focus:border-[#A995BE]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-[#E8E2EB] px-4 py-3 outline-none focus:border-[#A995BE]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Lead Source
                </label>
                <select
                  name="source"
                  value={form.source}
                  onChange={updateField}
                  className="w-full rounded-xl border border-[#E8E2EB] bg-white px-4 py-3 outline-none focus:border-[#A995BE]"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className="w-full rounded-xl border border-[#E8E2EB] bg-white px-4 py-3 outline-none focus:border-[#A995BE]"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Notes
                </label>
                <input
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  placeholder="Additional information"
                  className="w-full rounded-xl border border-[#E8E2EB] px-4 py-3 outline-none focus:border-[#A995BE]"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#806A98] px-5 py-3 text-sm font-medium text-white hover:bg-[#705987] disabled:opacity-50"
              >
                <Save size={16} />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Lead"
                    : "Save Lead"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-[#E8E2EB] px-5 py-3 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Lead List */}
        <div className="rounded-2xl border border-[#ECE7EF] bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">All Leads</h2>
              <p className="mt-1 text-sm text-[#8B8490]">
                Manage your potential clients.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search
                size={17}
                className="absolute left-3 top-3.5 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full rounded-xl border border-[#E8E2EB] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A995BE]"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[#827A89]">
              <RefreshCw size={24} className="mx-auto mb-3 animate-spin" />
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-12 text-center">
              <UserPlus
                size={35}
                className="mx-auto mb-3 text-[#B7A6C7]"
              />
              <h3 className="font-medium">No leads found</h3>
              <p className="mt-2 text-sm text-[#A098A5]">
                {search
                  ? "Try another search."
                  : "Add your first lead to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead._id}
                  className="rounded-xl border border-[#F0ECF1] p-5 transition hover:border-[#DCD0E6]"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold">
                          {lead.name}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            statusColors[lead.status] || statusColors.new
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-[#827A89]">
                        {lead.email && <p>{lead.email}</p>}
                        {lead.phone && <p>{lead.phone}</p>}
                        <p>
                          Source:{" "}
                          <span className="capitalize">
                            {(lead.source || "other").replace("_", " ")}
                          </span>
                        </p>
                        {lead.notes && <p>Notes: {lead.notes}</p>}
                        <p className="text-xs text-[#AAA2AD]">
                          Added:{" "}
                          {lead.createdAt
                            ? new Date(lead.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {lead.status !== "converted" && (
                        <button
                          onClick={() => handleConvert(lead._id)}
                          disabled={
                            convertingId === lead._id ||
                            deletingId === lead._id
                          }
                          className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 size={15} />
                          {convertingId === lead._id
                            ? "Converting..."
                            : "Convert"}
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(lead)}
                        disabled={
                          convertingId === lead._id ||
                          deletingId === lead._id
                        }
                        className="rounded-lg bg-[#F4F0F7] p-2.5 text-[#806A98] hover:bg-[#E9E1F2] disabled:opacity-50"
                        title="Edit lead"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(lead._id)}
                        disabled={
                          convertingId === lead._id ||
                          deletingId === lead._id
                        }
                        className="rounded-lg bg-red-50 p-2.5 text-red-500 hover:bg-red-100 disabled:opacity-50"
                        title="Delete lead"
                      >
                        {deletingId === lead._id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-8 border-t border-[#ECE7EF] pt-5 text-center text-xs text-[#A098A5]">
          Unfazed · Your practice, your space.
        </footer>
      </div>
    </div>
  );
}

export default Leads;
