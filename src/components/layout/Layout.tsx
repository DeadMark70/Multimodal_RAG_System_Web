import { type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function Layout({ children, requireAuth = true }: LayoutProps) {
  const { session, loading } = useAuth();

  if (loading) {
      return <Box>載入中...</Box>; // Simple loading state
  }

  if (requireAuth && !session) {
      return <Navigate to="/login" replace />;
  }

  return (
    <Box minH="100vh">
      <Sidebar />
      <Box ml={{ base: 0, md: 64 }} p="6" pt={{ base: 20, md: 6 }}>
        {children}
      </Box>
    </Box>
  );
}
