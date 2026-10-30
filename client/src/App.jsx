import { useState } from 'react'
import heroImage from './assets/hero-image.png'
import './App.css'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  return (
    <div className="landing-page">
      <nav className="navbar">
        <a href="/" className="nav-logo" id="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <span className="nav-logo-text">BorrowBuddy</span>
        </a>

        <div className={`nav-links${mobileMenuOpen ? ' mobile-open' : ''}`}>
          <a href="#about" id="nav-about">About</a>
          <a href="#projects" id="nav-projects">Projects</a>
          <a href="#contact" id="nav-contact">Contact Us</a>
          <button className="nav-signup" id="nav-signup" onClick={() => setShowSignup(true)}>Sign up</button>
        </div>

        <button
          className="nav-hamburger"
          id="nav-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      <section className="hero-section" id="hero">
        <div className="hero-content">
          <p className="hero-tagline">Share Today, Brighter Tomorrow</p>
          <h1 className="hero-heading">
            Borrow, Share<br />
            and Return<br />
            <span className="ease">with Ease.</span>
          </h1>
          <p className="hero-description">
            A simple and organized way to manage shared items
            within your community, team, or classroom.
          </p>
          <div className="hero-buttons">
            <button className="btn-get-started" id="btn-get-started">
              Get Started
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button className="btn-learn-more" id="btn-learn-more">Learn More</button>
          </div>
          <div className="why-heading">
            <span className="why-line"></span>
            <span className="why-text">WHY THIS PRODUCT EXISTS?</span>
          </div>
          <p className="why-description">
            Many useful items sit unused most of the time, while
            others need them. BorrowBuddy exists to make sharing
            easier, reduce unnecessary purchases, and build a
            culture of trust, sustainability and community.
          </p>
        </div>

        <div className="hero-image-wrapper">
          <img
            src={heroImage}
            alt="Shared items including a laptop, headphones, projector, plant, and desk lamp arranged on a navy desk"
            className="hero-image"
          />
        </div>
      </section>

      <section className="features-bar" id="features">
        <div className="feature-item" id="feature-communities">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="3" />
              <circle cx="17" cy="7" r="3" />
              <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              <path d="M17 11a4 4 0 014 4v2" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Build Communities</h3>
            <p>Share within your campus, team or neighborhood.</p>
          </div>
        </div>

        <div className="feature-item" id="feature-track">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Track Easily</h3>
            <p>Know who borrowed what and when.</p>
          </div>
        </div>

        <div className="feature-item" id="feature-waste">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.45 3.53L17 8l-3.55 1.47L12 13l-1.45-3.53L7 8l3.55-1.47L12 3z" />
              <path d="M5 20h14" />
              <path d="M12 13v7" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Reduce Waste</h3>
            <p>Give useful items a longer life.</p>
          </div>
        </div>
      </section>

      {showSignup && (
        <div className="signup-overlay" id="signup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSignup(false) }}>
          <div className="signup-modal" id="signup-modal">
            <button className="signup-close" id="signup-close" onClick={() => setShowSignup(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="signup-left">
              <div className="signup-left-content">
                <div className="signup-brand">
                  <svg className="signup-brand-icon" viewBox="0 0 40 40" fill="none">
                    <circle cx="14" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                    <circle cx="26" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                  </svg>
                  <div>
                    <div className="signup-brand-name">BorrowBuddy</div>
                    <div className="signup-brand-sub">Borrow & Return Tracker</div>
                  </div>
                </div>
                <p className="signup-tagline">Share items. Build better habits.</p>
                <div className="signup-categories">
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span>Books</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 2v4M17 2v4" />
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M12 10v4" />
                    </svg>
                    <span>Chargers</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Tools</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span>Sports</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="6" cy="12" r="1" />
                      <circle cx="18" cy="12" r="1" />
                    </svg>
                    <span>And more...</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="signup-right">
              <h2 className="signup-title">Create Account</h2>
              <p className="signup-subtitle">Join BorrowBuddy today!</p>

              <form className="signup-form" id="signup-form" onSubmit={(e) => e.preventDefault()}>
                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-name">Full Name</label>
                  <input
                    className="signup-input"
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-email">Email address</label>
                  <input
                    className="signup-input"
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-password">Password</label>
                  <div className="signup-password-wrapper">
                    <svg className="signup-password-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      className="signup-input signup-input-password"
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      id="signup-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button className="signup-register-btn" id="signup-register-btn" type="submit">Register</button>
              </form>

              <p className="signup-login-link">
                Already have an account? <a href="#login" id="signup-login" onClick={(e) => { e.preventDefault(); setShowSignup(false); setShowLogin(true); }}>Login</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="signup-overlay" id="login-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false) }}>
          <div className="signup-modal" id="login-modal">
            <button className="signup-close" id="login-close" onClick={() => setShowLogin(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="signup-left">
              <div className="signup-left-content">
                <div className="signup-brand">
                  <svg className="signup-brand-icon" viewBox="0 0 40 40" fill="none">
                    <circle cx="14" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                    <circle cx="26" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                  </svg>
                  <div>
                    <div className="signup-brand-name">BorrowBuddy</div>
                    <div className="signup-brand-sub">Borrow & Return Tracker</div>
                  </div>
                </div>
                <p className="signup-tagline">Share items. Build better habits.</p>
                <div className="signup-categories">
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span>Books</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 2v4M17 2v4" />
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M12 10v4" />
                    </svg>
                    <span>Chargers</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Tools</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span>Sports</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="6" cy="12" r="1" />
                      <circle cx="18" cy="12" r="1" />
                    </svg>
                    <span>And more...</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="signup-right">
              <h2 className="signup-title">Welcome Back</h2>
              <p className="signup-subtitle-blue">Log in to your account</p>

              <form className="signup-form" id="login-form" onSubmit={(e) => e.preventDefault()}>
                <div className="signup-field">
                  <label className="signup-label" htmlFor="login-email">Email address</label>
                  <input
                    className="signup-input"
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="login-password">Password</label>
                  <div className="signup-password-wrapper">
                    <svg className="signup-password-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      className="signup-input signup-input-password"
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      id="login-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="login-options">
                  <label className="login-remember" id="login-remember">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a href="#forgot" className="login-forgot" id="login-forgot">Forgot password?</a>
                </div>

                <button className="signup-register-btn" id="login-submit-btn" type="submit">Login</button>
              </form>

              <p className="signup-login-link">
                Don't have an account? <a href="#signup" id="login-signup" onClick={(e) => { e.preventDefault(); setShowLogin(false); setShowSignup(true); }}>Sign up</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
