
import {
  Box,
  Flex,
  Text,
  VStack,
  Icon,
  Link as ChakraLink,
  useColorModeValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
} from '@chakra-ui/react';
import { NavLink as RouterLink, useLocation } from 'react-router-dom';
import { FiHome, FiDatabase, FiMessageSquare, FiTrendingUp, FiSettings, FiShare2 } from 'react-icons/fi';
import { SettingsPanel } from '../settings';

interface NavItemProps {
  icon: React.ElementType;
  children: string;
  to: string;
}

const NavItem = ({ icon, children, to }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <ChakraLink
      as={RouterLink}
      to={to}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Flex
        align="center"
        p="3"
        mx="4"
        my="1"
        borderRadius="xl"
        cursor="pointer"
        role="group"
        transition=".2s ease"
        bg={isActive ? 'brand.500' : 'transparent'} 
        color={isActive ? 'white' : 'gray.500'}
        _hover={{
          bg: isActive ? 'brand.600' : 'gray.100',
          color: isActive ? 'white' : 'brand.500',
        }}
      >
        <Icon 
            mr="4" 
            fontSize="18" 
            as={icon} 
            _groupHover={{ color: isActive ? 'white' : 'brand.500' }}
        />
        <Text fontSize="md" fontWeight={isActive ? '600' : '500'}>{children}</Text>
      </Flex>
    </ChakraLink>
  );
};

export default function Sidebar() {
    // Glassmorphism background effect
    const bg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(17, 28, 68, 0.8)');
    const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
    const { isOpen, onOpen, onClose } = useDisclosure();
    
  return (
    <>
      <Box
        transition="3s ease"
        bg={bg}
        backdropFilter="blur(20px)"
        w={{ base: 'full', md: 64 }}
        pos="fixed"
        h="full"
        borderRight="1px"
        borderRightColor={borderColor}
        zIndex="sticky"
      >
        <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
          <Text fontSize="2xl" fontFamily="monospace" fontWeight="bold" color="brand.500">
            3R 儀表板
          </Text>
        </Flex>
        <VStack spacing={2} align="stretch" mt={4}>
          <NavItem icon={FiHome} to="/dashboard">儀表板</NavItem>
          <NavItem icon={FiDatabase} to="/knowledge">知識庫</NavItem>
          <NavItem icon={FiMessageSquare} to="/chat">對話</NavItem>
          <NavItem icon={FiTrendingUp} to="/experiment">實驗室</NavItem>
          <NavItem icon={FiShare2} to="/graph-demo">知識圖譜</NavItem>
        </VStack>

        {/* Settings Button */}
        <Box pos="absolute" bottom="8" left="0" right="0" px="4">
          <Flex
            align="center"
            p="3"
            mx="4"
            borderRadius="xl"
            cursor="pointer"
            transition=".2s ease"
            color="gray.500"
            _hover={{ bg: 'gray.100', color: 'brand.500' }}
            onClick={onOpen}
          >
            <Icon mr="4" fontSize="18" as={FiSettings} />
            <Text fontSize="md" fontWeight="500">設定</Text>
          </Flex>
        </Box>
      </Box>

      {/* Settings Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">RAG 設定</DrawerHeader>
          <DrawerBody p={0}>
            <SettingsPanel isDrawerMode />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
