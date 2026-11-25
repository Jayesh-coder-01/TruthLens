import React, { useContext, useState } from 'react';
import { Alert, Button, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { ArrowRight, CheckCircleFill, ExclamationTriangleFill, XCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

import { apiClient, extractApiError } from '../api/client';
import { MyContext } from '../context';
import Footer from './Footer';
import Header from './header';

const MAX_LENGTH = 5000;
const MIN_LENGTH = 3;

const DEMO_EXAMPLES = [
  {
    label: 'Demo Example (Wire-style headline)',
    text: 'May Brexit offer would hurt, cost EU citizens - EU parliament',
  },
  {
    label: 'Demo Example (Sensational-style headline)',
    text: "SATAN 2: Russia unvelis an image of its terrifying new 'SUPERNUKE' - Western world takes notice",
  },
  {
    label: 'Demo Example (Political profile headline)',
    text: 'Bobby Jindal, raised Hindu, uses story of Christian conversion to woo evangelicals for potential 2016 bid',
  },
];

function CheckByTitle() {
  document.title = 'TruthLens | Analyze News';
  const navigate = useNavigate();
  const { setLatestAnalysis } = useContext(MyContext);

  const [inputNewsTitle, setInputNewsTitle] = useState('');
  const [result, setResult] = useState(null);
  const [submittedText, setSubmittedText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async (textToAnalyze) => {
    const trimmed = textToAnalyze.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a news headline or short article text before analyzing.');
      setResult(null);
      return;
    }
    if (trimmed.length < MIN_LENGTH) {
      setErrorMessage(`Please enter at least ${MIN_LENGTH} characters for classification.`);
      setResult(null);
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setErrorMessage(`Input exceeds the ${MAX_LENGTH}-character limit. Please shorten your text.`);
      setResult(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.post('/api/usercheck/title/', {
        user_news: trimmed,
      });
      setResult(response.data);
      setSubmittedText(trimmed);
      setLatestAnalysis({
        input_text: trimmed,
        ...response.data,
      });
    } catch (err) {
      setResult(null);
      setErrorMessage(extractApiError(err, 'Failed to classify the submitted text.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runAnalysis(inputNewsTitle);
  };

  const handleSelectExample = (text) => {
    setInputNewsTitle(text);
    setErrorMessage('');
  };

  const handleDiscussWithAssistant = () => {
    if (result) {
      setLatestAnalysis({
        input_text: submittedText || inputNewsTitle.trim(),
        ...result,
      });
    }
    navigate('/assistant');
  };

  const charCount = inputNewsTitle.length;
  const isOverLimit = charCount > MAX_LENGTH;

  return (
    <>
      <Header activeContainer={2} />
      <main className="tl-main">
        <Container>
          <Row className="g-4">
            <Col lg={7}>
              <div className="tl-card">
                <span className="tl-eyebrow">ML Headline Classifier</span>
                <h1 className="h3 mb-2">Analyze a News Headline or Claim</h1>
                <p className="text-muted small mb-3">
                  This classifier uses a Multinomial Naive Bayes model with a 26,645-term{' '}
                  <code>CountVectorizer</code> vocabulary trained on WELFake news titles.
                </p>

                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3" controlId="news-headline-input">
                    <div className="d-flex justify-content-between align-items-baseline mb-1">
                      <Form.Label className="fw-semibold mb-0">
                        News Headline or Text
                      </Form.Label>
                      <span
                        className={`small ${isOverLimit ? 'text-danger fw-semibold' : 'text-muted'}`}
                      >
                        {charCount} / {MAX_LENGTH}
                      </span>
                    </div>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      className="tl-textarea"
                      placeholder="Paste a news headline or claim to evaluate..."
                      value={inputNewsTitle}
                      onChange={(e) => {
                        setInputNewsTitle(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      aria-describedby="headline-help"
                    />
                    <Form.Text id="headline-help" className="text-muted">
                      Best suited for English news headlines. Submitting very long article bodies
                      may differ from the title-only training distribution.
                    </Form.Text>
                  </Form.Group>

                  {errorMessage && (
                    <Alert variant="danger" role="alert" className="py-2 px-3 small">
                      {errorMessage}
                    </Alert>
                  )}

                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <Button
                      type="submit"
                      variant="primary"
                      className="tl-btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Analyzing...
                        </>
                      ) : (
                        'Run Classifier'
                      )}
                    </Button>
                    {inputNewsTitle && (
                      <Button
                        type="button"
                        variant="outline-secondary"
                        onClick={() => {
                          setInputNewsTitle('');
                          setResult(null);
                          setErrorMessage('');
                        }}
                        disabled={isLoading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </Form>

                <hr className="my-4" />
                <div>
                  <div className="small fw-semibold text-muted mb-2">
                    Demo Examples (from educational dataset — not proof of general accuracy)
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {DEMO_EXAMPLES.map((example, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="tl-example-chip"
                        onClick={() => handleSelectExample(example.text)}
                      >
                        <div className="fw-semibold text-primary mb-1" style={{ fontSize: '0.78rem' }}>
                          {example.label}
                        </div>
                        <div>{example.text}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={5}>
              <div className="tl-card h-100 d-flex flex-column justify-content-between gap-3">
                <div>
                  <h2 className="h5 mb-3">Classifier Result</h2>

                  {!result && !isLoading && (
                    <div className="tl-notice tl-notice-info">
                      <div>
                        Submit a headline on the left to inspect the model prediction, uncalibrated
                        model score, and verification steps.
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="text-center py-4 text-muted">
                      <Spinner animation="border" role="status" className="mb-2" />
                      <div className="small">Running Naive Bayes inference...</div>
                    </div>
                  )}

                  {result && !isLoading && (
                    <div
                      className={`tl-result-card ${
                        result.prediction ? 'tl-result-real' : 'tl-result-fake'
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                        <span className="small fw-semibold text-uppercase text-muted">
                          Model Prediction
                        </span>
                        <span className={result.prediction ? 'tl-badge-real' : 'tl-badge-fake'}>
                          {result.prediction ? (
                            <CheckCircleFill aria-hidden="true" />
                          ) : (
                            <XCircleFill aria-hidden="true" />
                          )}
                          Predicted as {result.predicted_label}
                        </span>
                      </div>

                      <div className="small text-muted mb-2">
                        <strong>Submitted text:</strong> &ldquo;{submittedText}&rdquo;
                      </div>

                      <div className="tl-metric-grid">
                        <div className="tl-metric-box">
                          <span className="tl-metric-label">Model score (uncalibrated)</span>
                          <span className="tl-metric-value">
                            {typeof result.model_score === 'number'
                              ? result.model_score.toFixed(4)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="tl-metric-box">
                          <span className="tl-metric-label">Raw class output</span>
                          <span className="tl-metric-value">
                            {result.raw_class} ({result.predicted_label})
                          </span>
                        </div>
                      </div>

                      {result.model_scores && (
                        <div className="small text-muted mt-2">
                          Class scores — Real (0):{' '}
                          <strong>{Number(result.model_scores.real).toFixed(4)}</strong> · Fake (1):{' '}
                          <strong>{Number(result.model_scores.fake).toFixed(4)}</strong>
                        </div>
                      )}

                      <div className="small text-muted mt-2">
                        <em>
                          Note: Model score is an uncalibrated Naive Bayes output, not the
                          probability that a claim is factually true.
                        </em>
                      </div>
                    </div>
                  )}

                  <div className="tl-notice mt-3" role="note">
                    <ExclamationTriangleFill size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
                    <div>
                      <strong>Limitation Notice:</strong> This is an automated model prediction, not
                      proof that a claim is true or false. Verify important information with
                      independent and primary sources.
                    </div>
                  </div>
                </div>

                {result && (
                  <Button
                    type="button"
                    variant="outline-primary"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleDiscussWithAssistant}
                  >
                    Ask Media Literacy Assistant about this result
                    <ArrowRight aria-hidden="true" />
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default CheckByTitle;
