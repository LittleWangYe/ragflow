import React, { createContext, useContext, useState } from 'react';

interface StreamingRequestContextType {
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
}

const StreamingRequestContext = createContext<
  StreamingRequestContextType | undefined
>(undefined);

export const StreamingRequestProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isStreaming, setIsStreaming] = useState(false);

  return (
    <StreamingRequestContext.Provider value={{ isStreaming, setIsStreaming }}>
      {children}
    </StreamingRequestContext.Provider>
  );
};

export const useStreamingRequest = () => {
  const context = useContext(StreamingRequestContext);
  if (context === undefined) {
    throw new Error(
      'useStreamingRequest must be used within StreamingRequestProvider',
    );
  }
  return context;
};
