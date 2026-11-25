import React, { createContext, useState } from 'react';

const MyContext = createContext();

function MyProvider({ children }) {
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  return (
    <MyContext.Provider value={{ latestAnalysis, setLatestAnalysis }}>
      {children}
    </MyContext.Provider>
  );
}

export { MyContext, MyProvider };
