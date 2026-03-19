import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiLogOut, FiSettings } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

interface AccountCardProps {
  onOpenSettings: () => void;
  onBeforeSignOut?: () => void;
}

function getFirstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export default function AccountCard({ onOpenSettings, onBeforeSignOut }: AccountCardProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const email = user?.email ?? '未提供 Email';
  const displayName =
    getFirstString([metadata.full_name, metadata.name, metadata.display_name]) ??
    email.split('@')[0] ??
    'Research User';
  const avatarUrl = getFirstString([metadata.avatar_url, metadata.picture]);

  const cardBg = useColorModeValue('whiteAlpha.900', 'whiteAlpha.80');
  const borderColor = useColorModeValue('surface.200', 'whiteAlpha.200');
  const secondaryText = useColorModeValue('surface.500', 'surface.300');
  const settingsBg = useColorModeValue('surface.50', 'whiteAlpha.100');
  const settingsBorder = useColorModeValue('surface.200', 'whiteAlpha.200');
  const logoutColor = useColorModeValue('error.500', 'red.200');
  const logoutBg = useColorModeValue('red.50', 'rgba(127, 29, 29, 0.28)');
  const logoutHoverBg = useColorModeValue('red.100', 'rgba(153, 27, 27, 0.36)');

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    onBeforeSignOut?.();
    setIsSigningOut(true);

    try {
      await signOut();
      toast({
        title: '已登出',
        description: '已安全登出並返回登入頁。',
        status: 'success',
        duration: 2500,
        isClosable: true,
        position: 'top',
      });
      void navigate('/login', { replace: true });
    } catch (error) {
      const description = error instanceof Error ? error.message : '請稍後再試一次。';
      toast({
        title: '登出失敗',
        description,
        status: 'error',
        duration: 3500,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Box
      data-testid="account-card"
      p={4}
      borderRadius="16px"
      border="1px solid"
      borderColor={borderColor}
      bg={cardBg}
      backdropFilter="blur(12px)"
    >
      <HStack align="flex-start" spacing={3}>
        <Avatar
          name={displayName}
          src={avatarUrl ?? undefined}
          size="sm"
          bg="brand.500"
          color="white"
        />
        <VStack align="flex-start" spacing={0.5} flex="1" minW={0}>
          <Text fontSize="sm" fontWeight="700" color="text.primary" noOfLines={1}>
            {displayName}
          </Text>
          <Text fontSize="xs" color={secondaryText} noOfLines={1}>
            {email}
          </Text>
        </VStack>
      </HStack>

      <HStack mt={4} spacing={2}>
        <Button
          flex="1"
          size="sm"
          variant="ghost"
          leftIcon={<FiSettings />}
          bg={settingsBg}
          borderWidth="1px"
          borderColor={settingsBorder}
          onClick={onOpenSettings}
        >
          設定
        </Button>
        <Button
          flex="1"
          size="sm"
          variant="ghost"
          leftIcon={<FiLogOut />}
          color={logoutColor}
          bg={logoutBg}
          _hover={{ bg: logoutHoverBg }}
          isLoading={isSigningOut}
          loadingText="登出中"
          onClick={() => {
            void handleSignOut();
          }}
        >
          登出
        </Button>
      </HStack>
    </Box>
  );
}
