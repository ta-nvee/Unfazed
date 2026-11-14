
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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

    try {
      setLoading(true);

      const response = await axiosInstance.post(
        "/auth/login",
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
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <Link to="/" className="login-back-home">
        ← Back to home
      </Link>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">u.</div>

          <h1>Unfazed</h1>

          <span className="login-tagline">
            A little space for growth.
          </span>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">
            WELCOME BACK
          </span>

          <h2>Good to see you again.</h2>

          <p>
            Sign in to manage your practice and continue making a difference.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">Email Address</label>

            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-submit"
          >
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <span>→</span>}
          </button>
        </form>

        <div className="login-divider">
          <span />
          <p>NEW TO UNFAZED?</p>
          <span />
        </div>

        <p className="login-register-text">
          Don't have an account?{" "}
          <Link to="/register">Create an account</Link>
        </p>

        <p className="login-footer">
          Your space. Your practice. Your journey. 🌿
        </p>
      </div>
    </div>
  );
}

export default Login;
