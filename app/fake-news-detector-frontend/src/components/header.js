import React from 'react';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { ShieldCheck } from 'react-bootstrap-icons';

function Header({ activeContainer }) {
  return (
    <header className="tl-header">
      <Navbar expand="lg" className="tl-navbar">
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand className="tl-brand">
              <span className="tl-brand-mark" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
              <span className="tl-brand-text">
                Truth<span className="tl-brand-accent">Lens</span>
              </span>
            </Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="truthlens-navbar" />
          <Navbar.Collapse id="truthlens-navbar" className="justify-content-end">
            <Nav className="align-items-lg-center gap-lg-1">
              <LinkContainer to="/">
                <Nav.Link className={activeContainer === 1 ? 'tl-nav-link active' : 'tl-nav-link'}>
                  Overview
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/checkbytitle">
                <Nav.Link className={activeContainer === 2 ? 'tl-nav-link active' : 'tl-nav-link'}>
                  Analyze News
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/assistant">
                <Nav.Link className={activeContainer === 4 ? 'tl-nav-link active' : 'tl-nav-link'}>
                  Media Assistant
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/newsquiz">
                <Nav.Link className={activeContainer === 3 ? 'tl-nav-link active' : 'tl-nav-link'}>
                  News Quiz
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="/methodology">
                <Nav.Link className={activeContainer === 5 ? 'tl-nav-link active' : 'tl-nav-link'}>
                  Methodology
                </Nav.Link>
              </LinkContainer>
              <NavDropdown title="Monitor Categories" id="tl-category-dropdown" className="tl-nav-dropdown">
                <LinkContainer to="/category/news">
                  <NavDropdown.Item>News</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/world">
                  <NavDropdown.Item>World</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/politics">
                  <NavDropdown.Item>Politics</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/business">
                  <NavDropdown.Item>Business</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/sport">
                  <NavDropdown.Item>Sport</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/environment">
                  <NavDropdown.Item>Environment</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/education">
                  <NavDropdown.Item>Education</NavDropdown.Item>
                </LinkContainer>
                <LinkContainer to="/category/arts">
                  <NavDropdown.Item>Arts</NavDropdown.Item>
                </LinkContainer>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
}

export default Header;
