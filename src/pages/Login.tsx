import { useEffect } from 'react';
import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Link,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const brandHighlights = ['Responsible', 'Reliable', 'Research'];

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const pageBg = useColorModeValue('surface.50', 'surface.900');
  const panelBg = useColorModeValue('white', 'surface.800');
  const panelBorder = useColorModeValue('surface.200', 'surface.700');
  const panelShadow = useColorModeValue('0 24px 60px rgba(15, 23, 42, 0.10)', '0 24px 60px rgba(2, 6, 23, 0.40)');
  const brandPanelBackground = useColorModeValue(
    'linear-gradient(145deg, #071552 0%, #0F2EC7 48%, #1337EC 100%)',
    'linear-gradient(145deg, #101827 0%, #0C24A2 48%, #1337EC 100%)'
  );
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const eyebrowColor = useColorModeValue('brand.600', 'brand.200');
  const mobileBrandBg = useColorModeValue('brand.50', 'whiteAlpha.120');

  useEffect(() => {
    if (session) {
      void navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <Flex minH="100vh" direction={{ base: 'column', md: 'row' }} bg={pageBg}>
      <Box display={{ base: 'none', md: 'block' }} flex="0 0 58%" minH="100vh">
        <motion.div
          initial={{ opacity: 0, x: -36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          style={{ height: '100%' }}
        >
          <Flex
            h="full"
            position="relative"
            overflow="hidden"
            background={brandPanelBackground}
            color="white"
            px={{ md: 10, xl: 14 }}
            py={{ md: 12, xl: 16 }}
            align="flex-end"
          >
            <Box
              position="absolute"
              top="-10%"
              right="-12%"
              w="280px"
              h="280px"
              borderRadius="full"
              bg="whiteAlpha.200"
              filter="blur(16px)"
            />
            <Box
              position="absolute"
              bottom="-14%"
              left="-10%"
              w="240px"
              h="240px"
              borderRadius="full"
              bg="whiteAlpha.100"
              filter="blur(20px)"
            />
            <Stack spacing={7} maxW="520px" position="relative" zIndex={1}>
              <Box>
                <Text fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.14em" color="whiteAlpha.800">
                  3R Dashboard
                </Text>
                <Heading mt={4} size="2xl" lineHeight={1.05}>
                  Responsible research, ready for production teams.
                </Heading>
                <Text mt={4} fontSize="lg" color="whiteAlpha.820" maxW="460px">
                  將知識檢索、對話驗證與評估流程收斂到同一個專業工作台，保持研究節奏與交付一致性。
                </Text>
              </Box>

              <HStack spacing={3} flexWrap="wrap">
                {brandHighlights.map((item) => (
                  <Badge
                    key={item}
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    bg="whiteAlpha.180"
                    color="white"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight="700"
                  >
                    {item}
                  </Badge>
                ))}
              </HStack>

              <Box
                maxW="420px"
                borderRadius="20px"
                bg="whiteAlpha.160"
                border="1px solid"
                borderColor="whiteAlpha.250"
                p={5}
                backdropFilter="blur(10px)"
              >
                <Text fontSize="sm" color="whiteAlpha.800">
                  專注在穩定的 RAG 工作流、清楚的實驗結果，以及一致的知識圖譜操作體驗。
                </Text>
              </Box>
            </Stack>
          </Flex>
        </motion.div>
      </Box>

      <Flex flex="1" align="center" justify="center" px={{ base: 6, md: 10, xl: 14 }} py={{ base: 10, md: 12 }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: '460px' }}
        >
          <Box
            bg={panelBg}
            border="1px solid"
            borderColor={panelBorder}
            borderRadius={{ base: '24px', md: '28px' }}
            boxShadow={panelShadow}
            p={{ base: 6, md: 8 }}
            w="full"
          >
            <Stack spacing={6}>
              <Box
                display={{ base: 'block', md: 'none' }}
                px={3}
                py={2}
                borderRadius="full"
                bg={mobileBrandBg}
                w="fit-content"
              >
                <Text fontSize="xs" fontWeight="700" color={eyebrowColor} textTransform="uppercase" letterSpacing="0.1em">
                  3R Dashboard
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="700" color={eyebrowColor} textTransform="uppercase" letterSpacing="0.12em">
                  Sign In
                </Text>
                <Heading as="h1" size="lg" mt={3} color="text.primary">
                  歡迎回到研究工作台
                </Heading>
                <Text mt={2} color={mutedText}>
                  使用既有帳號登入，繼續你的 Responsible RAG Research workflow。
                </Text>
              </Box>

              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#1337EC',
                        brandAccent: '#0F2EC7',
                        brandButtonText: '#FFFFFF',
                        defaultButtonBackground: '#F7F8FC',
                        defaultButtonBackgroundHover: '#EFF2F9',
                        inputBorder: '#D5DDEE',
                        inputBorderHover: '#B6C8FF',
                        inputBorderFocus: '#1337EC',
                      },
                      radii: {
                        borderRadiusButton: '12px',
                        buttonBorderRadius: '12px',
                        inputBorderRadius: '12px',
                      },
                    },
                  },
                }}
                providers={[]}
              />
              <Text fontSize="sm" color={mutedText} textAlign="center">
                忘記密碼？{' '}
                <Link as={RouterLink} to="/forgot-password" color="brand.600" fontWeight="700">
                  前往重設
                </Link>
              </Text>
            </Stack>
          </Box>
        </motion.div>
      </Flex>
    </Flex>
  );
}
