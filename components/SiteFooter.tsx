"use client";

import Link from "next/link";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="site-footer">
      <div className="container-shell">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link className="brand-mark" href="/" aria-label="Welden Industries home">
              <span className="brand-mark__badge">W</span>
              <span>
                <span className="brand-mark__title">WELDEN</span>
                <span className="brand-mark__sub">Industrial Automation</span>
              </span>
            </Link>
            <p className="site-footer__description">
              Precision-engineered automated machines for high-capacity industrial production lines.
              Engineering excellence since 2001.
            </p>
          </div>
          
          <nav className="site-footer__nav" aria-label="Footer navigation">
            <div className="footer-nav-group">
              <h4>Solutions</h4>
              <a href="#machine-pipe-cutting-machine">Pipe Cutting</a>
              <a href="#machine-idler-welding-machine">Idler Welding</a>
              <a href="#machine-double-end-boring-machine">Double End Boring</a>
              <a href="#machine-bearing-pushing-machine">Bearing Pushing</a>
            </div>
            
            <div className="footer-nav-group">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
              <a href="/admin">Staff Portal</a>
            </div>
            
            <div className="footer-nav-group">
              <h4>Support</h4>
              <a href="#advisor">AI Assistant</a>
              <a href="#contact">Technical Desk</a>
              <a href="/login">Account Login</a>
            </div>
          </nav>
        </div>
        
        <div className="site-footer__bottom">
          <p>&copy; {currentYear} Welden Industries. Precision Milled. Precision Engineered.</p>
          <div className="site-footer__legal">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/compliance">Compliance</a>
            <a href="/offices">Global Offices</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
