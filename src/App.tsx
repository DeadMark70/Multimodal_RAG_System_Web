import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Chat from './pages/Chat';
import Experiment from './pages/Experiment';
import GraphDemo from './pages/GraphDemo';
import EvaluationCenter from './pages/EvaluationCenter';

// 建立 React Query 客戶端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <Router>
              <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/experiment" element={<Experiment />} />
                  <Route path="/evaluation" element={<EvaluationCenter />} />
                  <Route path="/graph-demo" element={<GraphDemo />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
          </Router>
        </AuthProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
