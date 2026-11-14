
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import { Heart, Loader2, ArrowLeft, UserPlus } from "lucide-react";
import "./ClientLogin.css";

function ClientLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    localStorage.removeItem("clientToken");
    localStorage.removeItem("client");

    try {
      const response = await axiosInstance.post(
        "/client-auth/login",
        {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }
      );

      if (!response.data.token || !response.data.client) {
        throw new Error("Invalid login response from server.");
      }

      localStorage.setItem("clientToken", response.data.token);
      localStorage.setItem(
        "client",
        JSON.stringify(response.data.client)
      );

      navigate("/client/portal", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-login-page">
      <div className="client-login-decoration client-login-decoration-one" />
      <div className="client-login-decoration client-login-decoration-two" />

      <Link to="/" className="client-login-back">
        <ArrowLeft size={16} />
        Back to home
      </Link>

      <div className="client-login-card">

        <div className="client-login-brand">
          <div className="client-login-logo">
            <Heart size={26} />
          </div>

          <h1>Unfazed<span>.</span></h1>

          <p>A little space for growth.</p>
        </div>

        <div className="client-login-heading">
          <span>YOUR PERSONAL WELLNESS SPACE</span>

          <h2>Welcome back</h2>

          <p>
            Your wellness journey is waiting for you. Sign in to continue.
          </p>
        </div>

        {error && (
          <div className="client-login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="client-login-form">

          <div className="client-login-field">
            <label htmlFor="client-email">Email Address</label>

            <input
              id="client-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="client-login-field">
            <label htmlFor="client-password">Password</label>

            <input
              id="client-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="client-login-submit"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="client-login-spinner" />
                Logging in...
              </>
            ) : (
              <>
                Login to my account
                <span>→</span>
              </>
            )}
          </button>
        </form>

        <div className="client-login-divider">
          <span />
          <p>NEW TO UNFAZED?</p>
          <span />
        </div>

        <Link
          to="/client/register"
          className="client-register-button"
        >
          <UserPlus size={17} />
          Create Client Account
        </Link>

        <p className="client-login-explore">
          Looking for support?{" "}
          <Link to="/client/explore">
            Find a therapist
          </Link>
        </p>

        <div className="client-login-bottom">
          <p>
            Are you a therapist?{" "}
            <Link to="/login">Therapist Login</Link>
          </p>
        </div>

        <p className="client-login-footer">
          Your journey, your pace. Take it one day at a time. 🌿
        </p>
      </div>
    </div>
  );
}

export default ClientLogin;
