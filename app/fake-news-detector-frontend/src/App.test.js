import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MyProvider } from './context';
import CheckByTitle from './components/checkbytitle';
import ChatbotPanel from './components/ChatbotPanel';
import NewsQuiz from './components/newsquiz';

jest.mock('./api/client', () => ({
  API_BASE_URL: 'http://127.0.0.1:8000',
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  extractApiError: (err, fallback) => {
    if (!err) return fallback;
    if (err.response?.data?.error) return err.response.data.error;
    if (!err.response) return 'Unable to reach the TruthLens backend server. Confirm the Django API is running.';
    return fallback;
  },
}));

const { apiClient } = require('./api/client');

function renderWithProviders(ui) {
  return render(
    <MemoryRouter>
      <MyProvider>{ui}</MyProvider>
    </MemoryRouter>
  );
}

describe('TruthLens Frontend Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CheckByTitle validates empty input and displays classifier result with limitation notice', async () => {
    renderWithProviders(<CheckByTitle />);

    fireEvent.click(screen.getByRole('button', { name: /run classifier/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/please enter a news headline/i);

    apiClient.post.mockResolvedValueOnce({
      data: {
        prediction: false,
        predicted_label: 'Fake',
        raw_class: 1,
        model_score: 0.9912,
        model_scores: { real: 0.0088, fake: 0.9912 },
      },
    });

    fireEvent.change(screen.getByLabelText(/news headline or text/i), {
      target: { value: 'Sensational hoax headline for testing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /run classifier/i }));

    expect(await screen.findByText(/predicted as fake/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0\.9912/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/automated model prediction, not proof/i)).toBeInTheDocument();
  });

  test('CheckByTitle surfaces backend-down error cleanly', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Network Error'));
    renderWithProviders(<CheckByTitle />);

    fireEvent.change(screen.getByLabelText(/news headline or text/i), {
      target: { value: 'Sample headline when backend is down' },
    });
    fireEvent.click(screen.getByRole('button', { name: /run classifier/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unable to reach the truthlens backend server/i
    );
  });

  test('ChatbotPanel renders Gemini reply and handles missing key warning', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { configured: false, model: 'gemini-3.6-flash' },
    });

    renderWithProviders(
      <ChatbotPanel
        analysisContext={{
          input_text: 'Sample claim headline',
          predicted_label: 'Fake',
          raw_class: 1,
          model_score: 0.91,
        }}
      />
    );

    expect(await screen.findByText(/gemini api key not detected/i)).toBeInTheDocument();
    expect(screen.getByText(/attached classifier context/i)).toBeInTheDocument();

    apiClient.post.mockResolvedValueOnce({
      data: {
        reply: 'Check the original publisher and compare independent reporting.',
        model: 'gemini-3.6-flash',
        has_analysis_context: true,
      },
    });

    fireEvent.change(screen.getByLabelText(/ask the media literacy assistant/i), {
      target: { value: 'How do I verify this?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Check the original publisher and compare independent reporting.')
      ).toBeInTheDocument();
    });
  });

  test('NewsQuiz loads question and submits answer to POST /api/quiz/', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        id: 42,
        news_title: 'Parliament passes annual budget resolution',
        news_description: 'Lawmakers voted in favor on Thursday.',
      },
    });
    apiClient.post.mockResolvedValueOnce({
      data: {
        result: true,
        correct: true,
        actual_label: 'Real',
      },
    });

    renderWithProviders(<NewsQuiz />);

    expect(await screen.findByText('Parliament passes annual budget resolution')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/real news/i));
    fireEvent.click(screen.getByRole('button', { name: /check answer/i }));

    expect(await screen.findByText(/correct!/i)).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/api/quiz/', { id: 42, answer: true });
  });
});
