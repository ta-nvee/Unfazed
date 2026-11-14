
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/auth/register",
        formData
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem(
        "therapist",
        JSON.stringify(response.data.therapist)
      );

      navigate("/therapist/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-decoration register-decoration-one" />
      <div className="register-decoration register-decoration-two" />

      <Link to="/" className="register-back-home">
        ← Back to home
      </Link>

      <div className="register-card">
        <div className="register-brand">
          <div className="register-logo">u.</div>

          <h1>Unfazed</h1>

          <span className="register-tagline">
            A little space for growth.
          </span>
        </div>

        <div className="register-heading">
          <span className="register-eyebrow">
            YOUR JOURNEY STARTS HERE
          </span>

          <h2>Create your account</h2>

          <p>
            Build your practice and make space for meaningful connections.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-field">
            <label htmlFor="register-name">Full Name</label>

            <input
              id="register-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-email">Email Address</label>

            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Password</label>

            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              minLength={8}
              autoComplete="new-password"
              required
            />

            <span className="register-hint">
              Use at least 8 characters for your password.
            </span>
          </div>

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="register-submit"
          >
            {loading ? "Creating your account..." : "Create account"}
            {!loading && <span>→</span>}
          </button>
        </form>

        <div className="register-divider">
          <span />
          <p>ALREADY PART OF UNFAZED?</p>
          <span />
        </div>

        <p className="register-login-text">
          Already have an account?{" "}
          <Link to="/login">Login here</Link>
        </p>

        <p className="register-footer">
          Take it one step at a time. 🌿
        </p>
      </div>
    </div>
  );
}

export default Register;
