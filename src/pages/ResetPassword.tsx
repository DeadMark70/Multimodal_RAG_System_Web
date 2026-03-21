import { useState, type FormEvent } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/useAuth';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { session, loading, signOut } = useAuth();

  const pageBg = useColorModeValue('surface.50', 'surface.900');
  const panelBg = useColorModeValue('white', 'surface.800');
  const panelBorder = useColorModeValue('surface.200', 'surface.700');
  const panelShadow = useColorModeValue('0 24px 60px rgba(15, 23, 42, 0.10)', '0 24px 60px rgba(2, 6, 23, 0.40)');
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const eyebrowColor = useColorModeValue('brand.600', 'brand.200');

  const submitPasswordReset = async () => {
    if (!session) {
      setErrorMessage('重設連結已失效，請重新申請重設密碼。');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`密碼長度至少需要 ${MIN_PASSWORD_LENGTH} 個字元。`);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('兩次輸入的密碼不一致。');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      await signOut();
      toast({
        title: '密碼更新成功',
        description: '請使用新密碼重新登入。',
        status: 'success',
      });
      void navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage('更新密碼失敗，請重新嘗試。');
      toast({
        title: '密碼更新失敗',
        description: error instanceof Error ? error.message : '請稍後再試。',
        status: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    void submitPasswordReset();
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg={pageBg}>
        <Stack align="center" spacing={4}>
          <Spinner size="lg" color="brand.500" />
          <Text color={mutedText}>正在驗證重設連結...</Text>
        </Stack>
      </Flex>
    );
  }

  if (!session) {
    return (
      <Flex minH="100vh" bg={pageBg} align="center" justify="center" px={{ base: 6, md: 10 }} py={{ base: 10, md: 12 }}>
        <Box
          bg={panelBg}
          border="1px solid"
          borderColor={panelBorder}
          borderRadius={{ base: '24px', md: '28px' }}
          boxShadow={panelShadow}
          p={{ base: 6, md: 8 }}
          w="full"
          maxW="460px"
        >
          <Stack spacing={5}>
            <Text fontSize="sm" fontWeight="700" color={eyebrowColor} textTransform="uppercase" letterSpacing="0.12em">
              Password Reset
            </Text>
            <Heading as="h1" size="lg" color="text.primary">
              重設連結不可用
            </Heading>
            <Text color={mutedText}>
              連結可能已過期或無效，請重新申請重設密碼郵件。
            </Text>
            <Button as={RouterLink} to="/forgot-password" colorScheme="blue">
              重新申請重設密碼
            </Button>
            <Text fontSize="sm" color={mutedText} textAlign="center">
              或者{' '}
              <Link as={RouterLink} to="/login" color="brand.600" fontWeight="700">
                回登入頁
              </Link>
            </Text>
          </Stack>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg={pageBg} align="center" justify="center" px={{ base: 6, md: 10 }} py={{ base: 10, md: 12 }}>
      <Box
        bg={panelBg}
        border="1px solid"
        borderColor={panelBorder}
        borderRadius={{ base: '24px', md: '28px' }}
        boxShadow={panelShadow}
        p={{ base: 6, md: 8 }}
        w="full"
        maxW="460px"
      >
        <Stack spacing={6} as="form" onSubmit={handleSubmit}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color={eyebrowColor} textTransform="uppercase" letterSpacing="0.12em">
              Password Reset
            </Text>
            <Heading as="h1" size="lg" mt={3} color="text.primary">
              設定新密碼
            </Heading>
            <Text mt={2} color={mutedText}>
              請輸入新密碼並確認，更新後需重新登入。
            </Text>
          </Box>

          <FormControl isRequired>
            <FormLabel>新密碼</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>確認新密碼</FormLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </FormControl>

          {errorMessage ? (
            <Alert status="error" borderRadius="12px">
              <AlertIcon />
              <Text>{errorMessage}</Text>
            </Alert>
          ) : null}

          <Button
            type="submit"
            colorScheme="blue"
            isLoading={submitting}
            loadingText="更新中"
            isDisabled={submitting}
          >
            更新密碼
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
}
