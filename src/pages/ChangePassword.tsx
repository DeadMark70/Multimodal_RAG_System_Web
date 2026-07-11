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
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../services/supabase';
import { getPasswordAuthErrorMessage, validateNewPassword } from '../services/authPassword';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const pageBg = useColorModeValue('surface.50', 'surface.900');
  const panelBg = useColorModeValue('white', 'surface.800');
  const panelBorder = useColorModeValue('surface.200', 'surface.700');
  const panelShadow = useColorModeValue('0 24px 60px rgba(15, 23, 42, 0.10)', '0 24px 60px rgba(2, 6, 23, 0.40)');
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const eyebrowColor = useColorModeValue('brand.600', 'brand.200');

  const submitPasswordChange = async () => {
    if (!currentPassword) {
      setErrorMessage('請輸入目前密碼。');
      return;
    }

    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password,
      });
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
      const message = getPasswordAuthErrorMessage(error, 'change');
      setErrorMessage(message);
      toast({
        title: '密碼更新失敗',
        description: message,
        status: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLElement>) => {
    event.preventDefault();
    void submitPasswordChange();
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
        <Stack spacing={6} as="form" noValidate onSubmit={handleSubmit}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color={eyebrowColor} textTransform="uppercase" letterSpacing="0.12em">
              Password Security
            </Text>
            <Heading as="h1" size="lg" mt={3} color="text.primary">
              修改密碼
            </Heading>
            <Text mt={2} color={mutedText}>
              為了保護帳號，請先驗證目前密碼。更新後需要重新登入。
            </Text>
          </Box>

          <FormControl isRequired>
            <FormLabel>目前密碼</FormLabel>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </FormControl>

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
