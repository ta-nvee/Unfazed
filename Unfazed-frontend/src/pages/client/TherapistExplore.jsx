
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  UserRound,
  Languages,
  BriefcaseBusiness,
  Heart,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import axiosInstance from "../../api/axiosInstance";
import "./TherapistExplore.css";

function TherapistExplore() {
  const navigate = useNavigate();

  const [therapists, setTherapists] = useState([]);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch public therapists
  useEffect(() => {
    let isMounted = true;

    const fetchTherapists = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get("/therapists");
        const data = response.data;

        const list = Array.isArray(data)
          ? data
          : data?.therapists ||
            data?.data?.therapists ||
            data?.data ||
            [];

        if (isMounted) {
          setTherapists(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Therapist loading error:", err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load therapists. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTherapists();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get unique specializations
  const specializations = useMemo(() => {
    const values = therapists.flatMap((therapist) =>
      Array.isArray(therapist.specializations)
        ? therapist.specializations
        : []
    );

    return ["All", ...new Set(values)];
  }, [therapists]);

  // Filter therapists
  const filteredTherapists = useMemo(() => {
    return therapists.filter((therapist) => {
      const searchText = search.trim().toLowerCase();

      const therapistSpecializations = Array.isArray(
        therapist.specializations
      )
        ? therapist.specializations
        : [];

      const matchesSearch =
        (therapist.name || "").toLowerCase().includes(searchText) ||
        (therapist.bio || "").toLowerCase().includes(searchText) ||
        therapistSpecializations
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      const matchesSpecialization =
        specialization === "All" ||
        therapistSpecializations.includes(specialization);

      return matchesSearch && matchesSpecialization;
    });
  }, [therapists, search, specialization]);

  // Navigate to public therapist profile
  const selectTherapist = (therapist) => {
    if (!therapist.slug) {
      setError(
        `The public profile for ${
          therapist.name || "this therapist"
        } is unavailable because its slug is missing.`
      );
      return;
    }

    setError("");
    navigate(`/${encodeURIComponent(therapist.slug)}`);
  };

  // Clear search and filters
  const clearFilters = () => {
    setSearch("");
    setSpecialization("All");
    setError("");
  };

  return (
    <div className="therapist-explore-page">

      {/* NAVBAR */}
      <nav className="explore-navbar">
        <div className="explore-nav-inner">

          <button
            className="explore-brand"
            onClick={() => navigate("/")}
            aria-label="Go to homepage"
          >
            <span className="brand-icon">
              <Heart size={20} />
            </span>
            unfazed
          </button>

          <button
            className="explore-back-button"
            onClick={() => navigate("/client/portal")}
          >
            <ArrowLeft size={17} />
            My Portal
          </button>

        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="explore-main">

        {/* HERO SECTION */}
        <section className="explore-hero">

          <span className="explore-eyebrow">
            YOUR WELLNESS JOURNEY
          </span>

          <h1>
            Find someone who
            <br />
            <span>understands you.</span>
          </h1>

          <p>
            Every journey is different. Discover a therapist who
            understands your needs and helps you move forward at
            your own pace.
          </p>

          {/* SEARCH */}
          <div className="explore-search">
            <Search size={20} />

            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search therapists"
            />

            {search && (
              <button
                className="explore-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                type="button"
              >
                ×
              </button>
            )}
          </div>

          <div className="explore-hero-note">
            <Sparkles size={15} />
            A safe space to find the support you deserve.
          </div>

        </section>

        {/* RESULTS SECTION */}
        <section className="explore-results">

          <div className="explore-section-heading">

            <div>
              <span className="explore-eyebrow">
                FIND YOUR MATCH
              </span>

              <h2>Explore therapists</h2>

              <p className="explore-subheading">
                Take your time. The right support makes a difference.
              </p>
            </div>

            <span className="explore-count">
              {loading
                ? "Loading..."
                : `${filteredTherapists.length} found`}
            </span>

          </div>

          {/* SPECIALIZATION FILTERS */}
          {!loading && specializations.length > 1 && (
            <div className="specialization-filters">

              {specializations.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    specialization === item ? "active" : ""
                  }
                  onClick={() => setSpecialization(item)}
                >
                  {item}
                </button>
              ))}

            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="explore-message">

              <LoaderCircle
                className="explore-spinner"
                size={32}
              />

              <h3>Finding therapists for you...</h3>

              <p>
                Just a moment. We're preparing your options.
              </p>

            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="explore-message explore-error">

              <UserRound size={32} />

              <p>{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>

            </div>
          )}

          {/* EMPTY STATE */}
          {!loading &&
            !error &&
            filteredTherapists.length === 0 && (
              <div className="explore-empty">

                <div className="explore-empty-icon">
                  <Search size={30} />
                </div>

                <h3>No therapists found</h3>

                <p>
                  Try another search or select a different
                  specialization.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>

              </div>
            )}

          {/* THERAPIST CARDS */}
          {!loading &&
            !error &&
            filteredTherapists.length > 0 && (
              <div className="therapist-grid">

                {filteredTherapists.map((therapist) => (

                  <article
                    className="therapist-card"
                    key={therapist._id || therapist.id}
                  >

                    {/* CARD TOP */}
                    <div className="therapist-card-top">

                      <div className="therapist-avatar">

                        {therapist.profileImage ? (
                          <img
                            src={therapist.profileImage}
                            alt={therapist.name || "Therapist"}
                          />
                        ) : (
                          <UserRound size={34} />
                        )}

                      </div>

                      <span className="therapist-available">
                        <span className="availability-dot" />
                        Accepting clients
                      </span>

                    </div>

                    {/* NAME */}
                    <h3>
                      {therapist.name || "Therapist"}
                    </h3>

                    {/* BIO */}
                    <p className="therapist-bio">
                      {therapist.bio ||
                        "A therapist dedicated to supporting your wellness journey."}
                    </p>

                    {/* DETAILS */}
                    <div className="therapist-details">

                      {therapist.experience !== undefined && (
                        <span>
                          <BriefcaseBusiness size={15} />
                          {therapist.experience} years experience
                        </span>
                      )}

                      {Array.isArray(therapist.languages) &&
                        therapist.languages.length > 0 && (
                          <span>
                            <Languages size={15} />
                            {therapist.languages.join(", ")}
                          </span>
                        )}

                    </div>

                    {/* SPECIALIZATIONS */}
                    {Array.isArray(therapist.specializations) &&
                      therapist.specializations.length > 0 && (
                        <div className="therapist-tags">

                          {therapist.specializations
                            .slice(0, 4)
                            .map((item) => (
                              <span key={item}>
                                {item}
                              </span>
                            ))}

                        </div>
                      )}

                    {/* PROFILE BUTTON */}
                    <button
                      type="button"
                      className="therapist-select-button"
                      onClick={() => selectTherapist(therapist)}
                    >
                      View profile & book
                      <ArrowRight size={17} />
                    </button>

                  </article>

                ))}

              </div>
            )}

        </section>

      </main>

      {/* FOOTER */}
      <footer className="explore-footer">
        <p>
          <Heart size={13} />
          unfazed — A little space to feel better.
        </p>
      </footer>

    </div>
  );
}

export default TherapistExplore;
