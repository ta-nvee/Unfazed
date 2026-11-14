
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import {
  ArrowLeft,
  Package,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Clock,
  IndianRupee,
  Layers,
  RefreshCw,
} from "lucide-react";
import "./Packages.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  sessionCount: 3,
  price: "",
  validityDays: 30,
};

function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPackages = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get("/packages");
      setPackages(response.data.packages || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load packages."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openAddModal = () => {
    setEditingPackage(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingPackage(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      sessionCount: item.sessionCount || 1,
      price: item.price ?? "",
      validityDays: item.validityDays || 30,
    });
    setMessage("");
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      sessionCount: Number(form.sessionCount),
      price: Number(form.price),
      validityDays: Number(form.validityDays),
    };

    if (
      !payload.name ||
      !Number.isInteger(payload.sessionCount) ||
      payload.sessionCount <= 0 ||
      !Number.isFinite(payload.price) ||
      payload.price <= 0 ||
      !Number.isInteger(payload.validityDays) ||
      payload.validityDays <= 0
    ) {
      setError("Please enter valid package details.");
      setSaving(false);
      return;
    }

    try {
      if (editingPackage) {
        await axiosInstance.put(
          `/packages/${editingPackage._id}`,
          payload
        );
        setMessage("Package updated successfully.");
      } else {
        await axiosInstance.post("/packages", payload);
        setMessage("Package created successfully.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingPackage(null);
      await fetchPackages();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save package."
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePackage = async (item) => {
    setError("");
    setMessage("");

    try {
      await axiosInstance.put(`/packages/${item._id}`, {
        isActive: !item.isActive,
      });

      setMessage(
        item.isActive
          ? "Package deactivated."
          : "Package activated."
      );

      await fetchPackages();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update package status."
      );
    }
  };

  const deletePackage = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await axiosInstance.delete(`/packages/${item._id}`);
      setMessage("Package deleted successfully.");
      await fetchPackages();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete package."
      );
    }
  };

  const activeCount = packages.filter((item) => item.isActive).length;

  return (
    <div className="packages-page min-h-screen">
      <div className="packages-container">
        {/* Header */}
        <header className="packages-header">
          <Link to="/therapist/dashboard" className="packages-back">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>

          <div className="packages-heading-row">
            <div>
              <div className="packages-eyebrow">
                <Package size={17} />
                YOUR PRACTICE
              </div>

              <h1>Package Management</h1>

              <p>
                Create and customize therapy packages for your clients.
              </p>
            </div>

            <button
              type="button"
              className="packages-add-button"
              onClick={openAddModal}
            >
              <Plus size={19} />
              Add Package
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="packages-alert packages-error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Close error">
              <X size={16} />
            </button>
          </div>
        )}

        {message && (
          <div className="packages-alert packages-success" role="status">
            {message}
            <button
              onClick={() => setMessage("")}
              aria-label="Close message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="packages-summary">
          <div className="packages-summary-card">
            <div className="packages-summary-icon">
              <Layers size={22} />
            </div>
            <div>
              <p>Total Packages</p>
              <h3>{packages.length}</h3>
            </div>
          </div>

          <div className="packages-summary-card">
            <div className="packages-summary-icon active-icon">
              <Check size={22} />
            </div>
            <div>
              <p>Active Packages</p>
              <h3>{activeCount}</h3>
            </div>
          </div>

          <div className="packages-summary-card">
            <div className="packages-summary-icon inactive-icon">
              <Clock size={22} />
            </div>
            <div>
              <p>Inactive Packages</p>
              <h3>{packages.length - activeCount}</h3>
            </div>
          </div>
        </section>

        {/* Package List */}
        <section className="packages-list-section">
          <div className="packages-list-heading">
            <div>
              <h2>Your Therapy Packages</h2>
              <p>Manage your own prices and session plans.</p>
            </div>

            <button
              type="button"
              className="packages-refresh"
              onClick={fetchPackages}
              disabled={loading}
              title="Refresh packages"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="packages-empty">
              <RefreshCw className="packages-spinner" size={28} />
              <p>Loading your packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="packages-empty">
              <Package size={42} />
              <h3>No packages yet</h3>
              <p>Create your first therapy package to get started.</p>
              <button
                type="button"
                onClick={openAddModal}
                className="packages-add-button"
              >
                <Plus size={18} />
                Create Package
              </button>
            </div>
          ) : (
            <div className="packages-grid">
              {packages.map((item) => (
                <article
                  key={item._id}
                  className={`package-card ${
                    !item.isActive ? "package-inactive" : ""
                  }`}
                >
                  <div className="package-card-top">
                    <span
                      className={`package-status ${
                        item.isActive ? "status-active" : "status-inactive"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="package-card-icon">
                      <Package size={23} />
                    </span>
                  </div>

                  <h3>{item.name}</h3>

                  <p className="package-description">
                    {item.description || "A personalized therapy plan."}
                  </p>

                  <div className="package-price">
                    <IndianRupee size={22} />
                    {Number(item.price).toLocaleString("en-IN")}
                  </div>

                  <div className="package-details">
                    <div>
                      <Layers size={17} />
                      <span>
                        {item.sessionCount} sessions
                      </span>
                    </div>

                    <div>
                      <Clock size={17} />
                      <span>
                        Valid for {item.validityDays} days
                      </span>
                    </div>
                  </div>

                  <div className="package-actions">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="package-edit-button"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePackage(item)}
                      className="package-toggle-button"
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePackage(item)}
                      className="package-delete-button"
                      title="Delete package"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="packages-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <div className="packages-modal">
            <div className="packages-modal-header">
              <div>
                <h2>
                  {editingPackage ? "Edit Package" : "Create Package"}
                </h2>
                <p>
                  Customize your therapy package details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="packages-form-group">
                <label htmlFor="package-name">Package Name</label>
                <input
                  id="package-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Growth Pack"
                  required
                  maxLength={100}
                />
              </div>

              <div className="packages-form-group">
                <label htmlFor="package-description">
                  Description
                </label>
                <textarea
                  id="package-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe what this package includes..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="packages-form-grid">
                <div className="packages-form-group">
                  <label htmlFor="session-count">Sessions</label>
                  <input
                    id="session-count"
                    type="number"
                    name="sessionCount"
                    min="1"
                    step="1"
                    value={form.sessionCount}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="packages-form-group">
                  <label htmlFor="package-price">Price (₹)</label>
                  <input
                    id="package-price"
                    type="number"
                    name="price"
                    min="1"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="3000"
                    required
                  />
                </div>
              </div>

              <div className="packages-form-group">
                <label htmlFor="validity-days">
                  Validity (days)
                </label>
                <input
                  id="validity-days"
                  type="number"
                  name="validityDays"
                  min="1"
                  step="1"
                  value={form.validityDays}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="packages-modal-actions">
                <button
                  type="button"
                  className="packages-cancel-button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="packages-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingPackage
                    ? "Save Changes"
                    : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Packages;
