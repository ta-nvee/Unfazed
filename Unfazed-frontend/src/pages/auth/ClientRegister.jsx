
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import "./ClientRegister.css";

function ClientRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const therapistId = searchParams.get("therapistId");
  const isSelfRegistration = Boolean(therapistId);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    inviteToken: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (isSelfRegistration && !therapistId) {
      setError("Please select a therapist before registering.");
      return;
    }

    if (!isSelfRegistration && !formData.inviteToken.trim()) {
      setError("Please enter your invitation token.");
      return;
    }

    setLoading(true);

    localStorage.removeItem("clientToken");
    localStorage.removeItem("client");

    try {
      let response;

      if (isSelfRegistration) {
        response = await axiosInstance.post(
          "/client-auth/register/select-therapist",
          {
            name,
            email,
            password,
            therapistId,
          }
        );
      } else {
        response = await axiosInstance.post(
          "/client-auth/register",
          {
            name,
            email,
            password,
            inviteToken: formData.inviteToken.trim(),
          }
        );
      }

      const { token, client } = response.data || {};

      if (!token || !client) {
        throw new Error("Invalid registration response from server.");
      }

      localStorage.setItem("clientToken", token);
      localStorage.setItem("client", JSON.stringify(client));

      navigate("/client/portal", { replace: true });
    } catch (err) {
      console.error("Client registration error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-register-page">
      <div className="client-register-decoration client-register-decoration-one" />
      <div className="client-register-decoration client-register-decoration-two" />

      <Link
        to={isSelfRegistration ? "/client/explore" : "/"}
        className="client-register-back"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="client-register-card">

        <div className="client-register-brand">
          <div className="client-register-logo">
            <Heart size={26} />
          </div>

          <h1>Unfazed<span>.</span></h1>

          <p>A little space for growth.</p>
        </div>

        <div className="client-register-heading">
          <span>YOUR WELLNESS JOURNEY</span>

          <h2>Create your account</h2>

          <p>
            A little step towards taking care of yourself.
          </p>
        </div>

        <div className="client-register-info">
          {isSelfRegistration ? (
            <>
              <p className="client-register-info-title">
                Therapist selected ✓
              </p>
              <p>
                Your account will be connected to your selected therapist.
              </p>
            </>
          ) : (
            <>
              <p className="client-register-info-title">
                Therapist invitation
              </p>
              <p>
                Register using the invitation token shared by your therapist.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="client-register-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="client-register-form">

          <div className="client-register-field">
            <label htmlFor="client-register-name">Full Name</label>

            <input
              id="client-register-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
              placeholder="Your full name"
            />
          </div>

          <div className="client-register-field">
            <label htmlFor="client-register-email">Email Address</label>

            <input
              id="client-register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="client-register-field">
            <label htmlFor="client-register-password">Password</label>

            <input
              id="client-register-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />

            <span className="client-register-hint">
              Use at least 8 characters.
            </span>
          </div>

          {!isSelfRegistration && (
            <div className="client-register-field">
              <label htmlFor="client-register-token">
                Invitation Token
              </label>

              <input
                id="client-register-token"
                type="text"
                name="inviteToken"
                value={formData.inviteToken}
                onChange={handleChange}
                required
                placeholder="Paste your invitation token"
              />

              <span className="client-register-hint">
                Get this token from your therapist.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="client-register-submit"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="client-register-spinner" />
                Creating account...
              </>
            ) : (
              <>
                Create my account
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {isSelfRegistration && (
          <p className="client-register-explore">
            Want another therapist?{" "}
            <Link to="/client/explore">Explore</Link>
          </p>
        )}

        <div className="client-register-divider">
          <span />
          <p>ALREADY PART OF UNFAZED?</p>
          <span />
        </div>

        <p className="client-register-login">
          Already have an account?{" "}
          <Link to="/client/login">Login here</Link>
        </p>

        <p className="client-register-footer">
          Your journey, your pace. Take it one day at a time. 🌿
        </p>
      </div>
    </div>
  );
}

export default ClientRegister;
