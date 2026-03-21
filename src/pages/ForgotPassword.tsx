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
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../services/supabase';

const GENERIC_SUCCESS_MESSAGE = '如果信箱存在，我們已寄出重設密碼郵件，請至信箱確認。';
const GENERIC_ERROR_MESSAGE = '寄送失敗，請稍後再試。';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const toast = useToast();

  const pageBg = useColorModeValue('surface.50', 'surface.900');
  const panelBg = useColorModeValue('white', 'surface.800');
  const panelBorder = useColorModeValue('surface.200', 'surface.700');
  const panelShadow = useColorModeValue('0 24px 60px rgba(15, 23, 42, 0.10)', '0 24px 60px rgba(2, 6, 23, 0.40)');
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const eyebrowColor = useColorModeValue('brand.600', 'brand.200');

  const sendResetEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('請先輸入 Email。');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        throw error;
      }

      setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
      toast({
        title: '重設信件已送出',
        description: GENERIC_SUCCESS_MESSAGE,
        status: 'success',
      });
    } catch (error) {
      setErrorMessage(GENERIC_ERROR_MESSAGE);
      toast({
        title: '無法寄送重設信件',
        description: error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE,
        status: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    void sendResetEmail();
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
              Password Reset
            </Text>
            <Heading as="h1" size="lg" mt={3} color="text.primary">
              忘記密碼
            </Heading>
            <Text mt={2} color={mutedText}>
              輸入帳號 Email，我們會寄送重設密碼連結到你的信箱。
            </Text>
          </Box>

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
            loadingText="寄送中"
            isDisabled={submitting || email.trim().length === 0}
          >
            發送重設郵件
          </Button>

          <Text fontSize="sm" color={mutedText} textAlign="center">
            已想起密碼？{' '}
            <Link as={RouterLink} to="/login" color="brand.600" fontWeight="700">
              回登入頁
            </Link>
          </Text>
        </Stack>
      </Box>
    </Flex>
  );
}
