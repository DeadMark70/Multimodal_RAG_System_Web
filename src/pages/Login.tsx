import { useEffect } from 'react';
import { Box, Flex, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', '#111C44');

  useEffect(() => {
    if (session) {
      void navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <Flex minH="100vh" align="center" justify="center" bg={useColorModeValue('gray.50', '#0B1437')}>
      <Box 
        bg={cardBg} 
        p={8} 
        borderRadius="xl" 
        boxShadow="lg" 
        w="full" 
        maxW="md"
      >
        <Box textAlign="center" mb={6}>
            <Heading as="h2" size="xl" color="brand.500" mb={2}>
                3R Dashboard
            </Heading>
            <Text color="gray.500">Responsible RAG Research Platform</Text>
        </Box>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ 
              theme: ThemeSupa,
              variables: {
                  default: {
                      colors: {
                          brand: '#4318FF',
                          brandAccent: '#3A14D9',
                      }
                  }
              }
           }}
          providers={[]} // Email only for simplicity as per requirements
        />
      </Box>
    </Flex>
  );
}
