import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { useAuth } from '../../contexts/useAuth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Box>載入中...</Box>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
