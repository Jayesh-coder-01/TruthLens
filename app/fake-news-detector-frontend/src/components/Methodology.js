import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';

import Footer from './Footer';
import Header from './header';

function Methodology() {
  document.title = 'TruthLens | Methodology & Limitations';

  return (
    <>
      <Header activeContainer={5} />
      <main className="tl-main">
        <Container>
          <div className="tl-hero">
            <span className="tl-eyebrow">Verified Technical Architecture</span>
            <h1 className="h2 mb-3">How TruthLens Works &amp; Model Limitations</h1>
            <p className="tl-subtitle mb-0">
              Every metric and pipeline detail below is verified directly against{' '}
              <code>FakeNewsDetection_AIProject.ipynb</code>, the pickled model artifacts in{' '}
              <code>app/FakeNewsDetectorAPI/models/</code>, and the Django/React source code.
            </p>
          </div>

          <Row className="g-4">
            <Col md={6}>
              <div className="tl-card h-100">
                <h2 className="h5 mb-3">1. Deployed ML Inference Pipeline</h2>
                <ul className="small text-muted ps-3 d-flex flex-column gap-2 mb-0">
                  <li>
                    <strong>Dataset:</strong> <code>WELFake_Dataset.csv</code> (72,134 rows;
                    51.4% label <code>1</code>, 48.6% label <code>0</code>). In WELFake and{' '}
                    <code>game_data.csv</code>, <code>0</code> represents Real news and{' '}
                    <code>1</code> represents Fake news.
                  </li>
                  <li>
                    <strong>Feature Extraction:</strong>{' '}
                    <code>CountVectorizer(stop_words=&apos;english&apos;)</code> saved in{' '}
                    <code>vectorizer_model.pkl</code> with a <strong>26,645-word</strong>{' '}
                    title vocabulary (lowercase, unigrams, English stop words removed).
                  </li>
                  <li>
                    <strong>Classifier:</strong> <code>MultinomialNB(alpha=1.0)</code> saved in{' '}
                    <code>nb_model.pkl</code> with classes <code>[0, 1]</code>.
                  </li>
                  <li>
                    <strong>Observed Evaluation &amp; Leakage Caveat:</strong> On the 1,000-row{' '}
                    <code>game_data.csv</code> title sample (<code>df.iloc[:1000, :3]</code>),{' '}
                    <code>nb_model.pkl</code> achieves <strong>90.7%</strong> title-only accuracy.
                    However, this is <strong>not</strong> an independent held-out evaluation:
                    because <code>train_test_split(test_size=0.33, random_state=53)</code> splits
                    all 72,134 rows, roughly two-thirds of <code>game_data.csv</code> overlaps the
                    training split. In addition, <code>WELFake_Dataset.csv</code> contains 9,786
                    duplicate titles and 9,415 duplicate texts prior to splitting (notebook Cell
                    20), introducing duplicate-text leakage into the notebook&rsquo;s 23,805-row
                    test split (89% NB, 94% RF).
                  </li>
                </ul>
              </div>
            </Col>

            <Col md={6}>
              <div className="tl-card h-100">
                <h2 className="h5 mb-3">2. Key Defects Identified &amp; Fixed</h2>
                <ul className="small text-muted ps-3 d-flex flex-column gap-2 mb-0">
                  <li>
                    <strong>Label Inversion Fix:</strong> The upstream API mapped{' '}
                    <code>prediction[0] == 1</code> to <code>True</code> (&ldquo;Real
                    news!&rdquo;), inverting WELFake labels. TruthLens maps <code>0</code> to{' '}
                    <code>Real</code> (<code>True</code>) and <code>1</code> to{' '}
                    <code>Fake</code> (<code>False</code>) consistently across the classifier,
                    live feed, and quiz.
                  </li>
                  <li>
                    <strong>Live Feed Thread Crash Fix:</strong> Removed the import-time background
                    polling thread that crashed with <code>KeyError: &apos;response&apos;</code>{' '}
                    against an expired hardcoded Guardian API key (HTTP 401). Live monitoring now
                    runs safely on demand when <code>GUARDIAN_API_KEY</code> is configured.
                  </li>
                  <li>
                    <strong>Server-Side Quiz Grading:</strong> Removed answer leakage from{' '}
                    <code>GET /api/quiz/</code> and moved grading to <code>POST /api/quiz/</code>.
                  </li>
                  <li>
                    <strong>AI Media Literacy Assistant:</strong> Added <code>POST /api/chat/</code>{' '}
                    connected to Google Gemini via the server-side <code>google-genai</code> SDK.
                  </li>
                </ul>
              </div>
            </Col>
          </Row>

          <div className="tl-notice mt-4" role="note">
            <ExclamationTriangleFill size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
            <div className="small">
              <strong>Important Limitations:</strong> Bag-of-words Naive Bayes only inspects word
              frequencies learned from historical 2016-era WELFake articles. It cannot verify facts,
              understand sarcasm, check breaking events, or replace independent primary-source
              journalism. Uncalibrated Naive Bayes scores should never be interpreted as the
              probability that a claim is true.
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default Methodology;
