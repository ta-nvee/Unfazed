
import { Link } from "react-router-dom";
import "./Home.css";

const features = [
  {
    number: "01",
    icon: "◷",
    title: "Thoughtful scheduling",
    description:
      "Manage appointments, availability and sessions without the everyday back-and-forth.",
  },
  {
    number: "02",
    icon: "♡",
    title: "Meaningful connections",
    description:
      "Keep client information and communication organised in one calm workspace.",
  },
  {
    number: "03",
    icon: "✎",
    title: "Notes that stay organised",
    description:
      "Maintain session notes and important client details securely and conveniently.",
  },
  {
    number: "04",
    icon: "₹",
    title: "Simpler payments",
    description:
      "Manage payments and therapy packages with less administrative effort.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your space",
    description:
      "Set up your therapist profile and personalise your workspace.",
  },
  {
    number: "02",
    title: "Connect with clients",
    description:
      "Share your profile and make it easier for clients to find you.",
  },
  {
    number: "03",
    title: "Focus on what matters",
    description:
      "Manage sessions, notes and payments from one place.",
  },
];

function Home() {
  return (
    <main className="wellness-home">
      {/* NAVBAR */}
      <nav className="wellness-nav">
        <Link to="/" className="wellness-logo">
          <span className="wellness-logo-mark">u.</span>
          unfazed
        </Link>

        <div className="wellness-nav-links">
          <a href="#about">Our approach</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="wellness-nav-actions">
          <Link to="/login" className="wellness-login">
            Therapist login
          </Link>

          <Link to="/client/login" className="wellness-client-login">
            Client login
          </Link>

          <Link to="/register" className="wellness-nav-cta">
            Get started <span>↗</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="wellness-hero">
        <div className="wellness-hero-content">
          <span className="wellness-eyebrow">
            A CALMER WAY TO CARE
          </span>

          <h1>
            Care for others.
            <br />
            <span>Without losing yourself.</span>
          </h1>

          <p>
            A thoughtful space for therapists to manage their practice
            and for clients to find the support they deserve.
          </p>

          <div className="wellness-hero-actions">
            <Link to="/register" className="wellness-primary-btn">
              Build your practice <span>→</span>
            </Link>

            <Link to="/client/explore" className="wellness-text-link">
              Find a therapist <span>↗</span>
            </Link>
          </div>

          <div className="wellness-hero-caption">
            <span className="wellness-caption-dot" />
            A little more balance, every day.
          </div>
        </div>

        {/* HERO ILLUSTRATION */}
        <div className="wellness-hero-visual">
          <div className="wellness-hero-circle" />
          <div className="wellness-hero-small-circle" />

          <div className="wellness-floating-leaf leaf-one">✳</div>
          <div className="wellness-floating-leaf leaf-two">✿</div>

          <div className="wellness-person">
            <div className="wellness-person-hair" />

            <div className="wellness-person-head">
              <div className="wellness-person-face">
                <span className="wellness-eye eye-left" />
                <span className="wellness-eye eye-right" />
                <span className="wellness-smile" />
              </div>
            </div>

            <div className="wellness-person-neck" />

            <div className="wellness-person-body">
              <div className="wellness-person-arm arm-left" />
              <div className="wellness-person-arm arm-right" />
              <div className="wellness-person-hand" />
            </div>
          </div>

          <div className="wellness-visual-note">
            <span>♡</span>
            Your space to grow
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="wellness-value-strip">
        <div>
          <span>01</span>
          <p>More time for people</p>
        </div>

        <div>
          <span>02</span>
          <p>Less everyday admin</p>
        </div>

        <div>
          <span>03</span>
          <p>A more organised practice</p>
        </div>
      </section>

      {/* ABOUT / OUR APPROACH */}
      <section className="wellness-about" id="about">
        <div className="wellness-about-label">
          <span className="wellness-eyebrow">OUR APPROACH</span>
          <span className="wellness-about-number">01 / 04</span>
        </div>

        <div className="wellness-about-layout">
          <div className="wellness-about-content">
            <h2>
              Your work is about people.
              <br />
              <span>Not paperwork.</span>
            </h2>

            <p>
              We believe therapists deserve tools that make their work
              feel simpler, more organised and more human. Unfazed brings
              the everyday parts of running a therapy practice together,
              so you can spend more energy on meaningful connections.
            </p>

            <Link to="/register" className="wellness-underlined-link">
              Discover Unfazed <span>↗</span>
            </Link>
          </div>

          <div className="wellness-about-image-wrap">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=85"
              alt="A professional therapist in a calm counselling environment"
              className="wellness-about-image"
              loading="lazy"
            />

            <div className="wellness-about-image-note">
              <span>♡</span>
              A space to feel heard
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="wellness-features" id="features">
        <div className="wellness-section-heading">
          <div>
            <span className="wellness-eyebrow">MADE FOR YOUR EVERYDAY</span>
            <h2>
              Everything in its
              <br />
              <span>right place.</span>
            </h2>
          </div>

          <p>
            The little things that make managing your practice feel
            a whole lot easier.
          </p>
        </div>

        <div className="wellness-feature-grid">
          {features.map((feature) => (
            <article className="wellness-feature-card" key={feature.number}>
              <div className="wellness-feature-top">
                <span className="wellness-feature-number">
                  {feature.number}
                </span>

                <span className="wellness-feature-icon">
                  {feature.icon}
                </span>
              </div>

              <h3>{feature.title}</h3>
              <p>{feature.description}</p>

              <span className="wellness-feature-arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      {/* QUOTE */}
      <section className="wellness-quote">
        <span className="wellness-quote-mark">“</span>

        <p>
          You make space for others to heal.
          <br />
          <span>Let us make space for you.</span>
        </p>

        <span className="wellness-quote-caption">
          THE UNFAZED PROMISE
        </span>
      </section>

      {/* HOW IT WORKS */}
      <section className="wellness-process" id="how-it-works">
        <div className="wellness-process-heading">
          <span className="wellness-eyebrow">A SIMPLE BEGINNING</span>

          <h2>
            Getting started,
            <br />
            <span>without the overwhelm.</span>
          </h2>
        </div>

        <div className="wellness-process-grid">
          {steps.map((step) => (
            <article className="wellness-process-step" key={step.number}>
              <span className="wellness-process-number">
                {step.number}
              </span>

              <div className="wellness-process-line" />

              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="wellness-audience">
        <article className="wellness-audience-card therapist-card">
          <span className="wellness-eyebrow">FOR THERAPISTS</span>

          <h2>
            Your practice.
            <br />
            Your space.
          </h2>

          <p>
            Spend less time managing the details and more time doing
            the work you love.
          </p>

          <Link to="/register" className="wellness-audience-link">
            Create your workspace <span>→</span>
          </Link>

          <div className="wellness-audience-decoration">✳</div>
        </article>

        <article className="wellness-audience-card client-card">
          <span className="wellness-eyebrow">FOR CLIENTS</span>

          <h2>
            Your journey.
            <br />
            Your pace.
          </h2>

          <p>
            Explore therapist profiles and take a comfortable first
            step towards finding support.
          </p>

          <Link to="/client/explore" className="wellness-audience-link">
            Find your therapist <span>→</span>
          </Link>

          <div className="wellness-audience-decoration">♡</div>
        </article>
      </section>

      {/* FINAL CTA */}
      <section className="wellness-final-cta">
        <span className="wellness-eyebrow">A BETTER WAY FORWARD</span>

        <h2>
          Make room for
          <br />
          <span>what really matters.</span>
        </h2>

        <p>
          Your next chapter can feel a little more organised.
          Let's begin together.
        </p>

        <Link to="/register" className="wellness-primary-btn">
          Get started with Unfazed <span>→</span>
        </Link>
      </section>

      {/* CONTACT */}
      <section className="wellness-contact" id="contact">
        <div className="wellness-contact-content">
          <span className="wellness-eyebrow">LET'S CONNECT</span>

          <h2>
            We'd love to
            <span> hear from you.</span>
          </h2>

          <p>
            Have a question, need help getting started, or simply want
            to know more about Unfazed? We're just a message away.
          </p>

          <div className="wellness-contact-details">
            <a href="mailto:hello@unfazed.in">
              <span className="contact-icon">✉</span>
              hello@unfazed.in
            </a>

            <span className="wellness-contact-note">
              We're here to help you feel supported.
            </span>
          </div>
        </div>

        <div className="wellness-contact-card">
          <div className="contact-card-decoration">✳</div>

          <span>A little reminder</span>

          <h3>
            Taking care of yourself is part of taking care of others.
          </h3>

          <p>
            Let's make your therapy journey a little easier.
          </p>

          <Link to="/register" className="wellness-primary-btn">
            Get started <span>→</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="wellness-footer">
        <div className="wellness-footer-main">
          <div className="wellness-footer-brand">
            <Link to="/" className="wellness-logo">
              <span className="wellness-logo-mark">u.</span>
              unfazed
            </Link>

            <p>
              A little more balance for the people who care.
            </p>
          </div>

          <div className="wellness-footer-column">
            <h4>Explore</h4>
            <a href="#about">Our approach</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="wellness-footer-column">
            <h4>Therapists</h4>
            <Link to="/register">Get started</Link>
            <Link to="/login">Therapist login</Link>
          </div>

          <div className="wellness-footer-column">
            <h4>Clients</h4>
            <Link to="/client/explore">Find a therapist</Link>
            <Link to="/client/login">Client login</Link>
          </div>
        </div>

        <div className="wellness-footer-bottom">
          <span>
            © {new Date().getFullYear()} Unfazed. All rights reserved.
          </span>

          <span>Made with care ♡</span>
        </div>
      </footer>
    </main>
  );
}

export default Home;
