
import { useEffect, useState } from "react";
import {
  UserRound,
  Save,
  Loader2,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Cake,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() &&
      today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : "";
}

function formatDateForInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function ClientProfile({ onProfileUpdated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/client-auth/me");
        const client = response.data.client;

        setForm({
          name: client.name || "",
          email: client.email || "",
          phone: client.phone || "",
          gender: client.intake?.gender || "",
          dateOfBirth: formatDateForInput(
            client.intake?.dateOfBirth
          ),
        });
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (form.dateOfBirth) {
      const dob = new Date(`${form.dateOfBirth}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (Number.isNaN(dob.getTime()) || dob > today) {
        setError("Please enter a valid date of birth.");
        return;
      }
    }

    try {
      setSaving(true);

      const response = await axiosInstance.put("/client-auth/me", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
      });

      const updatedClient = response.data.client;

      setForm({
        name: updatedClient.name || "",
        email: updatedClient.email || "",
        phone: updatedClient.phone || "",
        gender: updatedClient.intake?.gender || "",
        dateOfBirth: formatDateForInput(
          updatedClient.intake?.dateOfBirth
        ),
      });

      const savedClient = localStorage.getItem("client");

      if (savedClient) {
        try {
          const parsedClient = JSON.parse(savedClient);

          const updatedLocalClient = {
            ...parsedClient,
            ...updatedClient,
          };

          localStorage.setItem(
            "client",
            JSON.stringify(updatedLocalClient)
          );

          onProfileUpdated?.(updatedLocalClient);
        } catch {
          onProfileUpdated?.(updatedClient);
        }
      } else {
        onProfileUpdated?.(updatedClient);
      }

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !== passwordForm.confirmPassword
    ) {
      setPasswordError(
        "New password and confirm password do not match."
      );
      return;
    }

    if (
      passwordForm.currentPassword === passwordForm.newPassword
    ) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    try {
      setChangingPassword(true);

      await axiosInstance.put("/client-auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordSuccess(
        "Your password has been changed successfully."
      );
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          "Unable to change your password. Please try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#e8e6dc] bg-[#fffefa] p-10">
        <Loader2
          className="animate-spin text-[#52745f]"
          size={26}
        />
      </div>
    );
  }

  const age = calculateAge(form.dateOfBirth);

  const inputClass =
    "block h-12 w-full min-w-0 rounded-xl border border-[#dfe6dc] bg-white px-4 text-sm leading-normal text-[#30483b] placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#829d84] focus:ring-2 focus:ring-[#e8eee6]";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#405847]";

  const passwordFields = [
    {
      name: "currentPassword",
      label: "Current Password",
      field: "current",
      placeholder: "Enter current password",
    },
    {
      name: "newPassword",
      label: "New Password",
      field: "new",
      placeholder: "Enter new password",
    },
    {
      name: "confirmPassword",
      label: "Confirm New Password",
      field: "confirm",
      placeholder: "Confirm new password",
    },
  ];

  const renderInput = (name, label, placeholder, type = "text") => (
    <div className="min-w-0">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>

      <input
        id={name}
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={name === "name" ? 100 : undefined}
        required={name === "name" || name === "email"}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-6">

      {/* PERSONAL INFORMATION */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-5 shadow-sm sm:p-7 md:p-8">

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#edf3eb] sm:h-14 sm:w-14">
            <UserRound size={25} className="text-[#52745f]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[#30483b] sm:text-xl">
              Personal Information
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Manage your personal and contact details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {renderInput(
              "name",
              "Full Name",
              "Enter your full name"
            )}

            {renderInput(
              "email",
              "Email Address",
              "Enter your email address",
              "email"
            )}

            {renderInput(
              "phone",
              "Phone Number",
              "Enter your phone number",
              "tel"
            )}

            <div className="min-w-0">
              <label htmlFor="gender" className={labelClass}>
                Gender
              </label>

              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div className="min-w-0 md:col-span-2">
              <label htmlFor="dateOfBirth" className={labelClass}>
                Date of Birth
              </label>

              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                max={formatDateForInput(new Date())}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* AGE DISPLAY */}
          <div className="flex items-center gap-4 rounded-xl border border-[#e0e9df] bg-[#f4f6f0] p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <Cake size={21} className="text-[#52745f]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500">
                Your Age
              </p>
              <p className="mt-1 text-base font-semibold text-[#30483b]">
                {age !== "" ? `${age} years` : "Add your date of birth"}
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm leading-relaxed text-green-700">
              {success}
            </p>
          )}

          <div className="flex justify-end border-t border-[#edf0e9] pt-5">
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* CHANGE PASSWORD */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e9df] bg-[#fffefa] p-5 shadow-sm sm:p-7 md:p-8">

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#edf3eb] sm:h-14 sm:w-14">
            <ShieldCheck size={25} className="text-[#52745f]" />
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[#30483b] sm:text-xl">
              Change Password
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Keep your account secure with a strong password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {passwordFields.map((item) => (
              <div key={item.name} className="min-w-0">
                <label
                  htmlFor={item.name}
                  className={labelClass}
                >
                  {item.label}
                </label>

                <div className="relative">
                  <input
                    id={item.name}
                    type={
                      showPasswords[item.field] ? "text" : "password"
                    }
                    name={item.name}
                    value={passwordForm[item.name]}
                    onChange={handlePasswordChange}
                    placeholder={item.placeholder}
                    autoComplete="off"
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePasswordVisibility(item.field)
                    }
                    className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-[#edf3eb] hover:text-[#52745f]"
                    aria-label={
                      showPasswords[item.field]
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPasswords[item.field] ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed text-gray-500">
            Your new password must contain at least 8 characters.
          </p>

          {passwordError && (
            <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-700">
              {passwordError}
            </p>
          )}

          {passwordSuccess && (
            <p className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm leading-relaxed text-green-700">
              {passwordSuccess}
            </p>
          )}

          <div className="flex justify-end border-t border-[#edf0e9] pt-5">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#52745f] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#405e4b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {changingPassword ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <LockKeyhole size={18} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ClientProfile;
