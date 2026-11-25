import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="tl-footer">
      <Container className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
        <div>
          <strong>TruthLens</strong> — Media Literacy &amp; News Analysis. Adapted from{' '}
          <a
            href="https://github.com/DJDarkCyber/Fake-News-Detector"
            target="_blank"
            rel="noopener noreferrer"
          >
            DJDarkCyber/Fake-News-Detector
          </a>{' '}
          (MIT License).
        </div>
        <div className="d-flex gap-3">
          <Link to="/checkbytitle">Analyze</Link>
          <Link to="/assistant">Assistant</Link>
          <Link to="/methodology">Methodology &amp; Limits</Link>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
