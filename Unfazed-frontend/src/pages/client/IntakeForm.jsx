
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Heart, ArrowLeft } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";

const IntakeForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    dateOfBirth: "",
    gender: "",
    occupation: "",
    presentingConcern: "",
    therapyHistory: "",
    medicalHistory: "",
    medications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.consent) {
      setError("Please provide consent before submitting.");
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("/client-portal/intake", form);

      setSuccess("Your intake form has been submitted successfully.");

      setTimeout(() => {
        navigate("/client/portal");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to submit your intake form. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2] px-4 py-10">
      <div className="max-w-3xl mx-auto">

        <button
          onClick={() => navigate("/client/portal")}
          className="flex items-center gap-2 text-[#627c68] mb-6"
        >
          <ArrowLeft size={18} />
          Back to Portal
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-[#e6e9df] p-6 md:p-10">

          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#edf2e9] p-3 rounded-xl">
              <Heart className="text-[#627c68]" size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Client Intake Form
              </h1>
              <p className="text-sm text-gray-500">
                Help your therapist understand your needs.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-5 mb-8">
            Please share the information you're comfortable providing.
            Your responses will be associated with your client account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-5 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">

            <section>
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ClipboardList size={18} />
                Personal Information
              </h2>

              <div className="grid md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full border rounded-xl p-3"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm mb-2 text-gray-600">
                    Occupation
                  </label>
                  <input
                    name="occupation"
                    value={form.occupation}
                    onChange={handleChange}
                    placeholder="Your occupation"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

              </div>
            </section>

            <section>
              <h2 className="font-semibold text-gray-800 mb-4">
                Your Wellbeing
              </h2>

              <div className="space-y-4">

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    What brings you to therapy?
                  </label>
                  <textarea
                    name="presentingConcern"
                    value={form.presentingConcern}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Share what you would like support with..."
                    className="w-full border rounded-xl p-3 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Have you attended therapy before?
                  </label>
                  <textarea
                    name="therapyHistory"
                    value={form.therapyHistory}
                    onChange={handleChange}
                    rows="3"
                    placeholder="You can share your previous experience..."
                    className="w-full border rounded-xl p-3 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Relevant Medical History
                  </label>
                  <textarea
                    name="medicalHistory"
                    value={form.medicalHistory}
                    onChange={handleChange}
                    rows="3"
                    className="w-full border rounded-xl p-3 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-600">
                    Current Medications (if any)
                  </label>
                  <textarea
                    name="medications"
                    value={form.medications}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border rounded-xl p-3 resize-none"
                  />
                </div>

              </div>
            </section>

            <section>
              <h2 className="font-semibold text-gray-800 mb-4">
                Emergency Contact
              </h2>

              <div className="grid md:grid-cols-2 gap-4">

                <input
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Contact person's name"
                  className="w-full border rounded-xl p-3"
                />

                <input
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="Contact phone number"
                  className="w-full border rounded-xl p-3"
                />

              </div>
            </section>

            <section className="bg-[#f6f7f1] rounded-2xl p-5">
              <h2 className="font-semibold text-gray-800 mb-3">
                Information & Consent
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                I understand that the information I provide will be stored
                securely and used by my therapist to support my care.
                I understand that I can ask questions about how my
                information is used.
              </p>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-1 accent-[#627c68]"
                />

                <span>
                  I have read and agree to the above information and consent
                  to submit my intake form.
                </span>
              </label>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#627c68] hover:bg-[#506a56] text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Intake Form"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default IntakeForm;
