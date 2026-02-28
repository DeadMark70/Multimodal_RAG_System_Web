
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
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { NavLink as RouterLink, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiDatabase,
  FiMessageSquare,
  FiTrendingUp,
  FiSettings,
  FiShare2,
  FiSun,
  FiMoon,
  FiMenu,
} from 'react-icons/fi';
import { SettingsPanel } from '../settings';

interface NavItemProps {
  icon: React.ElementType;
  children: string;
  to: string;
}

const NavItem = ({ icon, children, to }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  const activeBg = useColorModeValue('glass.300', 'glass.700');
  const hoverBg = useColorModeValue('glass.200', 'glass.600');

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
        bg={isActive ? activeBg : 'transparent'} 
        color={isActive ? 'brand.500' : 'gray.500'}
        fontWeight={isActive ? 'bold' : 'medium'}
        border="1px solid"
        borderColor={isActive ? 'brand.500' : 'transparent'}
        _hover={{
          bg: hoverBg,
          color: 'brand.500',
        }}
      >
        <Icon 
            mr="4" 
            fontSize="18" 
            as={icon} 
            _groupHover={{ color: 'brand.500' }}
        />
        <Text fontSize="md">{children}</Text>
      </Flex>
    </ChakraLink>
  );
};

export default function Sidebar() {
  // Glassmorphism background effect using theme tokens
  const bg = useColorModeValue('glass.500', 'glass.600'); // Slightly more opaque for sidebar
  const borderColor = useColorModeValue('glass.300', 'glass.300');
  const settingsDrawer = useDisclosure();
  const mobileNavDrawer = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <>
      {/* Mobile Top Bar */}
      <Flex
        display={{ base: 'flex', md: 'none' }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        h="16"
        px={4}
        align="center"
        justify="space-between"
        bg={bg}
        backdropFilter="blur(20px)"
        borderBottom="1px solid"
        borderColor={borderColor}
        zIndex={1200}
      >
        <IconButton
          aria-label="開啟導覽"
          icon={<FiMenu />}
          size="sm"
          variant="ghost"
          onClick={mobileNavDrawer.onOpen}
        />
        <Text fontSize="lg" fontFamily="monospace" fontWeight="bold" color="brand.500">
          3R 儀表板
        </Text>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Toggle Color Mode"
          icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
          onClick={toggleColorMode}
        />
      </Flex>

      {/* Desktop Sidebar */}
      <Box
        display={{ base: 'none', md: 'block' }}
        transition="0.3s ease"
        bg={bg}
        backdropFilter="blur(20px)"
        borderRight="1px"
        borderRightColor={borderColor}
        w={64}
        pos="fixed"
        h="full"
        top="0"
        left="0"
        zIndex="sticky"
      >
        <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
          <Text fontSize="2xl" fontFamily="monospace" fontWeight="bold" color="brand.500">
            3R 儀表板
          </Text>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Toggle Color Mode"
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={toggleColorMode}
          />
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
            _hover={{ bg: 'glass.200', color: 'brand.500' }}
            onClick={settingsDrawer.onOpen}
          >
            <Icon mr="4" fontSize="18" as={FiSettings} />
            <Text fontSize="md" fontWeight="500">設定</Text>
          </Flex>
        </Box>
      </Box>

      {/* Mobile Nav Drawer */}
      <Drawer
        isOpen={mobileNavDrawer.isOpen}
        placement="left"
        onClose={mobileNavDrawer.onClose}
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">導覽</DrawerHeader>
          <DrawerBody p={0}>
            <VStack spacing={2} align="stretch" mt={4}>
              <NavItem icon={FiHome} to="/dashboard">儀表板</NavItem>
              <NavItem icon={FiDatabase} to="/knowledge">知識庫</NavItem>
              <NavItem icon={FiMessageSquare} to="/chat">對話</NavItem>
              <NavItem icon={FiTrendingUp} to="/experiment">實驗室</NavItem>
              <NavItem icon={FiShare2} to="/graph-demo">知識圖譜</NavItem>
            </VStack>
            <Box px={4} mt={4}>
              <IconButton
                aria-label="開啟設定"
                icon={<FiSettings />}
                w="full"
                onClick={() => {
                  mobileNavDrawer.onClose();
                  settingsDrawer.onOpen();
                }}
              />
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Settings Drawer */}
      <Drawer isOpen={settingsDrawer.isOpen} placement="left" onClose={settingsDrawer.onClose} size="sm">
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
