import { useEffect, useState, type FormEvent } from 'react';
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
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/useAuth';

const SIGNUP_SUCCESS_MESSAGE = '註冊成功，請至信箱完成驗證後再登入。';
const SIGNUP_ERROR_MESSAGE = '註冊失敗，請稍後再試。';

export default function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  const pageBg = useColorModeValue('surface.50', 'surface.900');
  const panelBg = useColorModeValue('white', 'surface.800');
  const panelBorder = useColorModeValue('surface.200', 'surface.700');
  const panelShadow = useColorModeValue('0 24px 60px rgba(15, 23, 42, 0.10)', '0 24px 60px rgba(2, 6, 23, 0.40)');
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const eyebrowColor = useColorModeValue('brand.600', 'brand.200');

  useEffect(() => {
    if (session) {
      void navigate('/dashboard');
    }
  }, [session, navigate]);

  const submitSignup = async () => {
    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDisplayName) {
      setErrorMessage('請先輸入 Display Name。');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('請先輸入 Email。');
      return;
    }

    if (!password) {
      setErrorMessage('請先輸入 Password。');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            display_name: trimmedDisplayName,
            full_name: trimmedDisplayName,
          },
        },
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(SIGNUP_SUCCESS_MESSAGE);
      setPassword('');
      toast({
        title: '註冊請求已送出',
        description: SIGNUP_SUCCESS_MESSAGE,
        status: 'success',
      });
    } catch (error) {
      setErrorMessage(SIGNUP_ERROR_MESSAGE);
      toast({
        title: '無法完成註冊',
        description: error instanceof Error ? error.message : SIGNUP_ERROR_MESSAGE,
        status: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    void submitSignup();
  };

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
              Sign Up
            </Text>
            <Heading as="h1" size="lg" mt={3} color="text.primary">
              建立研究工作台帳號
            </Heading>
            <Text mt={2} color={mutedText}>
              建立新帳號後，我們會寄送驗證郵件到你的信箱。完成驗證後即可回登入頁使用系統。
            </Text>
          </Box>

          <FormControl isRequired>
            <FormLabel>Display Name</FormLabel>
            <Input
              type="text"
              placeholder="Your display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="nickname"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </FormControl>

          {successMessage ? (
            <Alert status="success" borderRadius="12px">
              <AlertIcon />
              <Text>{successMessage}</Text>
            </Alert>
          ) : null}

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
            loadingText="註冊中"
            isDisabled={submitting || !displayName.trim() || !email.trim() || password.length === 0}
          >
            建立帳號
          </Button>

          <Text fontSize="sm" color={mutedText} textAlign="center">
            已有帳號？{' '}
            <Link as={RouterLink} to="/login" color="brand.600" fontWeight="700">
              回登入頁
            </Link>
          </Text>
        </Stack>
      </Box>
    </Flex>
  );
}
