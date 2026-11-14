
import { useEffect, useState } from "react";
import {
  FileText,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";

const initialForm = {
  dateOfBirth: "",
  gender: "",
  occupation: "",
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  presentingConcern: "",
  relevantHistory: "",
  consentAccepted: false,
};

function ClientIntake() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [intakeCompleted, setIntakeCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadIntake = async () => {
      try {
        const response = await axiosInstance.get("/client-portal/intake");

        if (cancelled) return;

        const intake = response.data.intake || {};

        setForm({
          dateOfBirth: intake.dateOfBirth
            ? new Date(intake.dateOfBirth).toISOString().split("T")[0]
            : "",
          gender: intake.gender || "",
          occupation: intake.occupation || "",
          emergencyContact: {
            name: intake.emergencyContact?.name || "",
            phone: intake.emergencyContact?.phone || "",
            relationship: intake.emergencyContact?.relationship || "",
          },
          presentingConcern: intake.presentingConcern || "",
          relevantHistory: intake.relevantHistory || "",
          consentAccepted: response.data.consentAccepted === true,
        });

        setIntakeCompleted(Boolean(intake.completedAt));
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your intake form."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadIntake();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEmergencyChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      emergencyContact: {
        ...previous.emergencyContact,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.presentingConcern.trim()) {
      setError("Please describe the reason you are seeking support.");
      return;
    }

    if (!form.consentAccepted) {
      setError("Please accept the consent form before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await axiosInstance.put(
        "/client-portal/intake",
        {
          ...form,
          presentingConcern: form.presentingConcern.trim(),
        }
      );

      setIntakeCompleted(true);
      setSuccess(
        response.data.message ||
          "Your intake form has been saved successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save your intake form."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-10 flex items-center justify-center rounded-2xl bg-white p-8">
        <Loader2 className="animate-spin text-[#52745f]" />
        <span className="ml-3 text-sm text-gray-500">
          Loading intake form...
        </span>
      </div>
    );
  }

  return (
    <section className="mb-12 rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-6 shadow-sm md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#edf3eb] p-3">
            <Heart className="text-[#52745f]" size={23} />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#30483b]">
              Your Wellness Intake
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Help your therapist understand your needs.
            </p>
          </div>
        </div>

        {intakeCompleted && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 size={14} />
            Completed
          </span>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              max={new Date().toISOString().split("T")[0]}
              value={form.dateOfBirth}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#829d84]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Gender
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#829d84]"
            >
              <option value="">Select gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">
                Prefer not to say
              </option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Occupation
          </label>
          <input
            type="text"
            name="occupation"
            value={form.occupation}
            onChange={handleChange}
            placeholder="Your occupation"
            className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#829d84]"
          />
        </div>

        <div className="border-t border-[#eee] pt-5">
          <h4 className="mb-4 font-semibold text-[#30483b]">
            Emergency Contact
          </h4>

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              name="name"
              value={form.emergencyContact.name}
              onChange={handleEmergencyChange}
              placeholder="Contact name"
              className="w-full rounded-xl border border-[#e5e7dd] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
            />

            <input
              name="phone"
              type="tel"
              value={form.emergencyContact.phone}
              onChange={handleEmergencyChange}
              placeholder="Phone number"
              className="w-full rounded-xl border border-[#e5e7dd] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
            />

            <input
              name="relationship"
              value={form.emergencyContact.relationship}
              onChange={handleEmergencyChange}
              placeholder="Relationship"
              className="w-full rounded-xl border border-[#e5e7dd] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            What brings you here? *
          </label>
          <textarea
            name="presentingConcern"
            value={form.presentingConcern}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Share what you would like support with..."
            className="w-full rounded-xl border border-[#e5e7dd] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Relevant History (Optional)
          </label>
          <textarea
            name="relevantHistory"
            value={form.relevantHistory}
            onChange={handleChange}
            rows={3}
            placeholder="Anything else you would like your therapist to know..."
            className="w-full rounded-xl border border-[#e5e7dd] px-4 py-3 text-sm outline-none focus:border-[#829d84]"
          />
        </div>

        <div className="rounded-xl bg-[#f5f6f0] p-5">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consentAccepted"
              checked={form.consentAccepted}
              onChange={(e) =>
                setForm((previous) => ({
                  ...previous,
                  consentAccepted: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 accent-[#52745f]"
            />

            <label
              htmlFor="consentAccepted"
              className="text-sm leading-6 text-gray-600"
            >
              I understand and consent to receiving therapy services.
              I acknowledge that my information will be used for
              providing and managing my care. *
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#405e4b] disabled:opacity-60 sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText size={18} />
              {intakeCompleted ? "Update Intake Form" : "Submit Intake Form"}
            </>
          )}
        </button>
      </form>
    </section>
  );
}

export default ClientIntake;
