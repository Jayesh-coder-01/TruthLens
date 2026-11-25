import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Col, Container, Row, Spinner } from 'react-bootstrap';
import { CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import { useParams } from 'react-router-dom';

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

function CategoryContainer() {
  const { category } = useParams();
  const [newsData, setNewsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchNewsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.get(`/api/category/${encodeURIComponent(category)}/`);
      setNewsData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Unable to load articles for this category.'));
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    document.title = `TruthLens | Category: ${category}`;
    fetchNewsData();
  }, [category, fetchNewsData]);

  return (
    <>
      <Header activeContainer={1} />
      <main className="tl-main">
        <Container>
          <div className="tl-card">
            <span className="tl-eyebrow">Monitored Category</span>
            <h1 className="h3 mb-3 text-capitalize">{category}</h1>

            {errorMessage && (
              <Alert variant="danger" className="small">
                {errorMessage}
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-4 text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading category articles...
              </div>
            ) : newsData.length === 0 ? (
              <div className="tl-notice tl-notice-info">
                <div>
                  No stored articles match the &ldquo;{category}&rdquo; category yet. Configure{' '}
                  <code>GUARDIAN_API_KEY</code> and refresh the feed from the Overview page to
                  populate live categories.
                </div>
              </div>
            ) : (
              <Row className="g-3">
                {newsData.map((news) => (
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
                          <h2 className="h6 mb-2">{news.title}</h2>
                        </div>
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
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
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

export default CategoryContainer;
