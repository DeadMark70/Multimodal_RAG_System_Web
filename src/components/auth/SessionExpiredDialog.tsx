import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

export default function SessionExpiredDialog() {
  const { acknowledgeSessionExpired, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const confirmRef = useRef<HTMLButtonElement>(null);

  const continueToLogin = () => {
    acknowledgeSessionExpired();
    void navigate('/login?reason=expired', { replace: true });
  };

  return (
    <AlertDialog
      isCentered
      isOpen={sessionExpired}
      leastDestructiveRef={confirmRef}
      onClose={() => undefined}
      closeOnEsc={false}
      closeOnOverlayClick={false}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader>登入已過期</AlertDialogHeader>
          <AlertDialogBody>為了保護你的資料，請重新登入後繼續。</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={confirmRef} colorScheme="blue" onClick={continueToLogin}>
              前往登入
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
