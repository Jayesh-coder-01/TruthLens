import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { CheckCircleFill, ExclamationTriangleFill, XCircleFill } from 'react-bootstrap-icons';

import { apiClient, extractApiError } from '../api/client';
import Footer from './Footer';
import Header from './header';

function NewsQuiz() {
  document.title = 'TruthLens | News Quiz';

  const [quizItem, setQuizItem] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchQuizData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSelectedAnswer('');
    setFeedback(null);

    try {
      const response = await apiClient.get('/api/quiz/');
      setQuizItem(response.data);
    } catch (err) {
      setQuizItem(null);
      setErrorMessage(
        extractApiError(
          err,
          'Could not load a quiz item. Ensure quiz_data_loader has been run on the backend.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  const handleCheckAnswer = async () => {
    if (!quizItem || selectedAnswer === '') {
      setErrorMessage('Please select either Real News or Fake News before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/api/quiz/', {
        id: quizItem.id,
        answer: selectedAnswer === 'True',
      });
      const data = response.data;
      setFeedback(data);
      setScore((prev) => ({
        correct: prev.correct + (data.correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to grade your quiz answer.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header activeContainer={3} />
      <main className="tl-main">
        <Container>
          <Row className="justify-content-center">
            <Col lg={9}>
              <div className="tl-card">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <span className="tl-eyebrow mb-1">Media Literacy Practice</span>
                    <h1 className="h3 mb-0">News Identification Quiz</h1>
                  </div>
                  <div className="tl-metric-box text-center">
                    <span className="tl-metric-label">Session Score</span>
                    <span className="tl-metric-value">
                      {score.correct} / {score.total}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <Alert variant="danger" role="alert" className="small">
                    {errorMessage}
                  </Alert>
                )}

                {isLoading ? (
                  <div className="text-center py-5 text-muted">
                    <Spinner animation="border" role="status" className="mb-2" />
                    <div className="small">Loading quiz article...</div>
                  </div>
                ) : quizItem ? (
                  <>
                    <div className="p-3 rounded border bg-light mb-3">
                      <h2 className="h5 mb-2">{quizItem.news_title}</h2>
                      <p
                        className="small text-muted mb-0"
                        style={{ maxHeight: '220px', overflowY: 'auto', whiteSpace: 'pre-line' }}
                      >
                        {quizItem.news_description}
                      </p>
                    </div>

                    <div className="d-flex flex-column gap-2 mb-3" role="radiogroup" aria-label="Classify quiz article">
                      <label
                        className={`tl-quiz-option ${selectedAnswer === 'True' ? 'selected' : ''}`}
                        htmlFor="quiz-real"
                      >
                        <input
                          id="quiz-real"
                          type="radio"
                          name="quiz-answer"
                          value="True"
                          checked={selectedAnswer === 'True'}
                          onChange={(e) => {
                            setSelectedAnswer(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          disabled={Boolean(feedback)}
                        />
                        <div>
                          <div className="fw-semibold">Real News</div>
                          <div className="small text-muted">
                            Matches standard newsroom reporting in the WELFake dataset (label 0)
                          </div>
                        </div>
                      </label>

                      <label
                        className={`tl-quiz-option ${selectedAnswer === 'False' ? 'selected' : ''}`}
                        htmlFor="quiz-fake"
                      >
                        <input
                          id="quiz-fake"
                          type="radio"
                          name="quiz-answer"
                          value="False"
                          checked={selectedAnswer === 'False'}
                          onChange={(e) => {
                            setSelectedAnswer(e.target.value);
                            if (errorMessage) setErrorMessage('');
                          }}
                          disabled={Boolean(feedback)}
                        />
                        <div>
                          <div className="fw-semibold">Fake News</div>
                          <div className="small text-muted">
                            Matches fabricated or unreliable articles in the WELFake dataset (label 1)
                          </div>
                        </div>
                      </label>
                    </div>

                    {feedback && (
                      <Alert
                        variant={feedback.correct ? 'success' : 'warning'}
                        className="d-flex align-items-center gap-2 small"
                      >
                        {feedback.correct ? (
                          <CheckCircleFill size={18} aria-hidden="true" />
                        ) : (
                          <XCircleFill size={18} aria-hidden="true" />
                        )}
                        <div>
                          {feedback.correct ? 'Correct! ' : 'Not quite. '}
                          In the WELFake dataset, this item is labeled as{' '}
                          <strong>{feedback.actual_label}</strong>.
                        </div>
                      </Alert>
                    )}

                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        className="tl-btn-primary"
                        onClick={handleCheckAnswer}
                        disabled={isSubmitting || Boolean(feedback)}
                      >
                        {isSubmitting ? 'Checking...' : 'Check Answer'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        onClick={fetchQuizData}
                        disabled={isSubmitting}
                      >
                        Next Article
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button type="button" variant="outline-primary" onClick={fetchQuizData}>
                    Retry Loading Quiz
                  </Button>
                )}

                <div className="tl-notice mt-4" role="note">
                  <ExclamationTriangleFill size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
                  <div className="small">
                    Quiz items come from the historical <code>game_data.csv</code> sample (first
                    1,000 rows of <code>WELFake_Dataset.csv</code>) for educational practice.
                  </div>
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

export default NewsQuiz;
