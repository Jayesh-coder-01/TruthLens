import React, { useContext } from 'react';
import { Col, Container, Row } from 'react-bootstrap';

import { MyContext } from '../context';
import ChatbotPanel from './ChatbotPanel';
import Footer from './Footer';
import Header from './header';

function AssistantPage() {
  document.title = 'TruthLens | Media Literacy Assistant';
  const { latestAnalysis, setLatestAnalysis } = useContext(MyContext);

  return (
    <>
      <Header activeContainer={4} />
      <main className="tl-main">
        <Container>
          <Row className="g-4">
            <Col lg={8}>
              <ChatbotPanel
                analysisContext={latestAnalysis}
                onClearContext={() => setLatestAnalysis(null)}
              />
            </Col>
            <Col lg={4}>
              <div className="tl-card">
                <h2 className="h5 mb-3">Verification Checklist</h2>
                <ol className="small text-muted ps-3 mb-3 d-flex flex-column gap-2">
                  <li>
                    <strong>Trace the origin:</strong> Who originally published the claim, and is
                    it a primary source?
                  </li>
                  <li>
                    <strong>Check author &amp; date:</strong> Is an old story or photo being
                    recycled out of context?
                  </li>
                  <li>
                    <strong>Read past the headline:</strong> Does the body evidence actually support
                    the headline?
                  </li>
                  <li>
                    <strong>Cross-check coverage:</strong> Are independent, reputable newsrooms
                    reporting the same facts?
                  </li>
                  <li>
                    <strong>Separate fact from framing:</strong> Watch for loaded adjectives,
                    anonymized quotes, or opinion presented as reporting.
                  </li>
                </ol>
                <div className="small text-muted border-top pt-3">
                  Chat messages are kept in session memory only and are not stored in a database.
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default AssistantPage;
