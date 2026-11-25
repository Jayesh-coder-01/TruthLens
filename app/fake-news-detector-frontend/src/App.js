import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import AssistantPage from './components/AssistantPage';
import CategoryContainer from './components/category';
import CheckByTitle from './components/checkbytitle';
import Home from './components/home';
import Methodology from './components/Methodology';
import NewsQuiz from './components/newsquiz';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/newsquiz',
    element: <NewsQuiz />,
  },
  {
    path: '/checkbytitle',
    element: <CheckByTitle />,
  },
  {
    path: '/analyze',
    element: <CheckByTitle />,
  },
  {
    path: '/assistant',
    element: <AssistantPage />,
  },
  {
    path: '/methodology',
    element: <Methodology />,
  },
  {
    path: '/category/:category',
    element: <CategoryContainer />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
