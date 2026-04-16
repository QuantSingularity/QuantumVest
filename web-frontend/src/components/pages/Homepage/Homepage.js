import React from "react";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../../../styles/Homepage.css";
import HomepageNavMenu from "./HomepageNavMenu";

const Homepage = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="homepage-container">
      <HomepageNavMenu />
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Next-Gen Investment Analytics Powered by AI & Blockchain
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Make data-driven investment decisions with predictive analytics and
            portfolio optimization
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/dashboard">
              <button className="hero-cta-primary">Get Started</button>
            </Link>
            <button
              className="hero-cta-secondary"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Learn More
            </button>
          </motion.div>
        </div>
        <div className="hero-background">
          {/* Background particles or waves could be added here */}
        </div>
        <div className="hero-illustration">
          {/* This would be replaced with an actual illustration in production */}
          <svg
            width="500"
            height="400"
            viewBox="0 0 500 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50,200 Q125,100 200,200 T350,200"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="5"
              fill="none"
            />
            <path
              d="M100,250 Q175,150 250,250 T400,250"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="5"
              fill="none"
            />
            <circle cx="150" cy="150" r="20" fill="rgba(255,255,255,0.5)" />
            <circle cx="250" cy="200" r="30" fill="rgba(255,255,255,0.5)" />
            <circle cx="350" cy="150" r="25" fill="rgba(255,255,255,0.5)" />
            <path
              d="M150,300 L350,100"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
              strokeDasharray="10,5"
            />
            <path
              d="M100,100 L400,300"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
              strokeDasharray="10,5"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Powerful Features
        </motion.h2>
        <motion.div
          className="features-grid"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="feature-title">AI-Powered Predictions</h3>
            <p className="feature-description">
              Leverage advanced machine learning algorithms to predict market
              trends and investment opportunities with high accuracy.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 22L12 2L22 22H2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 18H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14V10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="feature-title">Blockchain Integration</h3>
            <p className="feature-description">
              Secure and transparent investment tracking with blockchain
              technology, ensuring data integrity and trust.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 4H3C1.89543 4 1 4.89543 1 6V18C1 19.1046 1.89543 20 3 20H21C22.1046 20 23 19.1046 23 18V6C23 4.89543 22.1046 4 21 4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 10H23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="feature-title">Portfolio Optimization</h3>
            <p className="feature-description">
              Optimize your investment portfolio based on risk tolerance, goals,
              and market conditions for maximum returns.
            </p>
          </motion.div>

          <motion.div className="feature-card" variants={fadeInUp}>
            <div className="feature-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 20V10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 20V4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 20V14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="feature-title">Real-time Analytics</h3>
            <p className="feature-description">
              Monitor your investments in real-time with comprehensive analytics
              dashboards and customizable alerts.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <motion.div
            className="stat-item"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="stat-value">10,000+</h3>
            <p className="stat-label">Active Users</p>
          </motion.div>

          <motion.div
            className="stat-item"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="stat-value">95%</h3>
            <p className="stat-label">Prediction Accuracy</p>
          </motion.div>

          <motion.div
            className="stat-item"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="stat-value">$50M+</h3>
            <p className="stat-label">Managed Assets</p>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How It Works
        </motion.h2>
        <div className="steps-container">
          <motion.div
            className="step-item"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="step-number">1</div>
            <div className="step-content">
              <h3 className="step-title">Connect Your Data</h3>
              <p className="step-description">
                Link your investment accounts or import your portfolio data to
                get started with personalized analytics.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="step-item"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="step-number">2</div>
            <div className="step-content">
              <h3 className="step-title">AI Analysis</h3>
              <p className="step-description">
                Our AI models analyze market trends, historical data, and
                blockchain transactions to generate predictions.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="step-item"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="step-number">3</div>
            <div className="step-content">
              <h3 className="step-title">Optimize Portfolio</h3>
              <p className="step-description">
                Receive personalized recommendations to optimize your portfolio
                based on your risk profile and goals.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="step-item"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="step-number">4</div>
            <div className="step-content">
              <h3 className="step-title">Track Performance</h3>
              <p className="step-description">
                Monitor your investment performance with real-time analytics and
                adjust strategies as needed.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          What Our Users Say
        </motion.h2>
        <div className="testimonials-container">
          <motion.div
            className="testimonial-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="testimonial-content">
              "QuantumVest has transformed my investment strategy. The AI
              predictions have been remarkably accurate, and the portfolio
              optimization tools helped me increase my returns by 22% in just
              six months."
            </p>
            <div className="testimonial-author">
              <div
                className="author-avatar"
                style={{
                  backgroundColor: "#2563eb",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                JD
              </div>
              <div className="author-info">
                <span className="author-name">Jane Doe</span>
                <span className="author-title">Investment Analyst</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <motion.h2
            className="cta-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Start Optimizing Your Investments Today
          </motion.h2>
          <motion.p
            className="cta-description"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Join thousands of investors who are leveraging AI and blockchain
            technology to make smarter investment decisions.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/dashboard" className="cta-button">
              Create Free Account
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
