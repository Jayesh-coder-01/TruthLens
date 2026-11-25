import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import {
  ArrowClockwise,
  ChatLeftText,
  CheckCircleFill,
  ExclamationTriangleFill,
  JournalCheck,
  Search,
  XCircleFill,
} from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';

import { apiClient, extractApiError } from '../api/client';
import Footer from './Footer';
import Header from './header';

function formatPublishedDate(isoString) {
  if (!isoString) return 'Date unavailable';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Home() {
  document.title = 'TruthLens | News Analysis & Media Literacy';

  const [liveNewsData, setLiveNewsData] = useState([]);
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchLiveData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [articlesRes, statusRes] = await Promise.all([
        apiClient.get('/api/live/'),
        apiClient.get('/api/live/status/'),
      ]);
      setLiveNewsData(Array.isArray(articlesRes.data) ? articlesRes.data : []);
      setMonitorStatus(statusRes.data || null);
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Could not load live monitoring status.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage('');
    try {
      await apiClient.post('/api/live/refresh/');
      await fetchLiveData();
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Unable to refresh Guardian news feed.'));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Header activeContainer={1} />
      <main className="tl-main">
        <Container>
          <section className="tl-hero">
            <span className="tl-eyebrow">Media Literacy &amp; Applied NLP</span>
            <h1 className="display-6 fw-bold mb-3">
              Evaluate Online Headlines Critically with TruthLens
            </h1>
            <p className="tl-subtitle mb-4">
              TruthLens combines a Multinomial Naive Bayes headline classifier with a Google
              Gemini Media Literacy Assistant and an interactive news quiz so students and readers
              can inspect model predictions without mistaking them for proof.
            </p>
            <div className="d-flex flex-wrap gap-2 mb-4">
              <Link to="/checkbytitle" className="btn btn-primary tl-btn-primary">
                <Search className="me-2" aria-hidden="true" />
                Analyze a Headline
              </Link>
              <Link to="/assistant" className="btn btn-outline-primary">
                <ChatLeftText className="me-2" aria-hidden="true" />
                Open Media Literacy Assistant
              </Link>
              <Link to="/newsquiz" className="btn btn-outline-secondary">
                <JournalCheck className="me-2" aria-hidden="true" />
                Take News Quiz
              </Link>
            </div>
            <div className="tl-notice" role="note">
              <ExclamationTriangleFill size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <strong>Responsible Use:</strong> An automated model prediction is not proof that a
                claim is true or false. Always verify important information with independent and
                primary sources.
              </div>
            </div>
          </section>

          <Row className="g-3 mb-4">
            <Col md={4}>
              <div className="tl-card h-100">
                <h2 className="h5">1. Headline Classifier</h2>
                <p className="small text-muted mb-0">
                  Submit a headline to inspect the WELFake-trained <code>CountVectorizer</code> +{' '}
                  <code>MultinomialNB</code> label (<code>0=Real</code>, <code>1=Fake</code>) and
                  uncalibrated model score.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="tl-card h-100">
                <h2 className="h5">2. Media Literacy Assistant</h2>
                <p className="small text-muted mb-0">
                  Discuss any classifier result with a Gemini-powered assistant grounded in
                  verification habits, source-checking steps, and explicit model limitations.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="tl-card h-100">
                <h2 className="h5">3. Verification Quiz</h2>
                <p className="small text-muted mb-0">
                  Practice spotting sensational framing vs. standard reporting on 1,000 historical
                  items from <code>game_data.csv</code>, graded server-side.
                </p>
              </div>
            </Col>
          </Row>

          <section className="tl-card">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h2 className="h4 mb-1">Live Guardian Feed Monitoring (Optional)</h2>
                <div className="small text-muted">
                  Classifies stored headlines from The Guardian Open Platform when{' '}
                  <code>GUARDIAN_API_KEY</code> is configured.
                </div>
              </div>
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing || (monitorStatus && !monitorStatus.configured)}
              >
                {isRefreshing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" aria-hidden="true" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <ArrowClockwise className="me-1" aria-hidden="true" />
                    Refresh Feed
                  </>
                )}
              </Button>
            </div>

            {errorMessage && (
              <Alert variant="danger" className="small">
                {errorMessage}
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-4 text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading live feed status...
              </div>
            ) : liveNewsData.length === 0 ? (
              <div className="tl-notice tl-notice-info">
                <div>
                  {monitorStatus && !monitorStatus.configured
                    ? 'Live Guardian monitoring is disabled because GUARDIAN_API_KEY is not configured in .env. All core analysis, quiz, and assistant features remain fully available.'
                    : 'No monitored articles are stored yet. Click Refresh Feed when GUARDIAN_API_KEY is configured.'}
                </div>
              </div>
            ) : (
              <Row className="g-3">
                {liveNewsData.map((news) => (
                  <Col sm={6} lg={4} key={news.id}>
                    <article className="tl-news-card">
                      {news.img_url && news.img_url !== 'None' && (
                        <img
                          src={news.img_url}
                          alt={news.title}
                          className="tl-news-thumb"
                        />
                      )}
                      <div className="p-3 d-flex flex-column justify-content-between flex-grow-1 gap-2">
                        <div>
                          <div className="small text-muted mb-1">
                            {news.section_name || news.news_category} ·{' '}
                            {formatPublishedDate(news.publication_date)}
                          </div>
                          <h3 className="h6 mb-2">{news.title}</h3>
                        </div>
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                          <span className={news.prediction ? 'tl-badge-real' : 'tl-badge-fake'}>
                            {news.prediction ? (
                              <CheckCircleFill aria-hidden="true" />
                            ) : (
                              <XCircleFill aria-hidden="true" />
                            )}
                            Classifier: {news.prediction ? 'Real' : 'Fake'}
                          </span>
                          {news.web_url && (
                            <a
                              href={news.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="small"
                            >
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  </Col>
                ))}
              </Row>
            )}
          </section>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default Home;
