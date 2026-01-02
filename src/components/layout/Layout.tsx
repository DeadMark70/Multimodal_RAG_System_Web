import { type ReactNode } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function Layout({ children, requireAuth = true }: LayoutProps) {
  const { session, loading } = useAuth();
  const bg = useColorModeValue('gray.50', '#0B1437');

  if (loading) {
      return <Box>載入中...</Box>; // Simple loading state
  }

  if (requireAuth && !session) {
      return <Navigate to="/login" replace />;
  }

  return (
    <Box minH="100vh" bg={bg}>
      <Sidebar />
      <Box ml={{ base: 0, md: 60 }} p="6">
        {children}
      </Box>
    </Box>
  );
}
