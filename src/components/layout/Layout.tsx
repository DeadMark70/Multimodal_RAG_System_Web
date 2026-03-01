import { type ReactNode } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/useAuth';
import { Navigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function Layout({ children, requireAuth = true }: LayoutProps) {
  const { session, loading } = useAuth();
  const contentBg = useColorModeValue('transparent', 'transparent');
  const divider = useColorModeValue('surface.200', 'surface.700');

  if (loading) {
      return <Box>載入中...</Box>; // Simple loading state
  }

  if (requireAuth && !session) {
      return <Navigate to="/login" replace />;
  }

  return (
    <Box minH="100vh" bg="bg.canvas">
      <Sidebar />
      <Box
        ml={{ base: 0, md: 64 }}
        p={{ base: 4, md: 6 }}
        pt={{ base: 20, md: 6 }}
        bg={contentBg}
        borderTop="1px solid"
        borderColor={{ base: divider, md: 'transparent' }}
      >
        {children}
      </Box>
    </Box>
  );
}
