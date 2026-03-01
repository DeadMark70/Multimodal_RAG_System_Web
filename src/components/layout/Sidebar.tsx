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
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const activeColor = useColorModeValue('brand.600', 'brand.200');
  const iconDefaultColor = useColorModeValue('surface.500', 'surface.300');
  const textColor = useColorModeValue('surface.600', 'surface.200');
  const borderColor = useColorModeValue('brand.200', 'brand.700');
  const hoverBg = useColorModeValue('surface.100', 'surface.700');

  return (
    <ChakraLink
      as={RouterLink}
      to={to}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Flex
        align="center"
        p={3}
        mx={3}
        my={1}
        borderRadius="10px"
        cursor="pointer"
        role="group"
        transition="all .2s ease"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : textColor}
        fontWeight={isActive ? '700' : '600'}
        border="1px solid"
        borderColor={isActive ? borderColor : 'transparent'}
        _hover={{
          bg: hoverBg,
          color: activeColor,
        }}
      >
        <Icon
            mr={3}
            fontSize="17"
            as={icon}
            color={isActive ? activeColor : iconDefaultColor}
            _groupHover={{ color: activeColor }}
        />
        <Text fontSize="sm">{children}</Text>
      </Flex>
    </ChakraLink>
  );
};

export default function Sidebar() {
  const bg = useColorModeValue('bg.sidebar', 'bg.sidebar');
  const borderColor = useColorModeValue('surface.200', 'surface.700');
  const logoColor = useColorModeValue('brand.600', 'brand.200');
  const mutedText = useColorModeValue('surface.500', 'surface.300');
  const settingsHoverBg = useColorModeValue('surface.100', 'surface.700');
  const shadow = useColorModeValue('0 8px 24px rgba(17, 24, 39, 0.08)', '0 8px 30px rgba(2, 6, 23, 0.35)');
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
        boxShadow={shadow}
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
        <Text fontSize="lg" fontWeight="800" color={logoColor}>
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
        boxShadow={shadow}
        borderRight="1px"
        borderRightColor={borderColor}
        w={64}
        pos="fixed"
        h="full"
        top="0"
        left="0"
        zIndex="sticky"
      >
        <Flex h="20" alignItems="center" mx={6} justifyContent="space-between">
          <Box>
            <Text fontSize="xl" fontWeight="800" color={logoColor} lineHeight={1.1}>
              3R 儀表板
            </Text>
            <Text fontSize="xs" color={mutedText}>Professional Workspace</Text>
          </Box>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Toggle Color Mode"
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={toggleColorMode}
          />
        </Flex>
        <Text px={6} pt={2} pb={2} fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="0.08em">
          Navigation
        </Text>
        <VStack spacing={1} align="stretch">
          <NavItem icon={FiHome} to="/dashboard">儀表板</NavItem>
          <NavItem icon={FiDatabase} to="/knowledge">知識庫</NavItem>
          <NavItem icon={FiMessageSquare} to="/chat">對話</NavItem>
          <NavItem icon={FiTrendingUp} to="/experiment">實驗室</NavItem>
          <NavItem icon={FiShare2} to="/graph-demo">知識圖譜</NavItem>
        </VStack>

        {/* Settings Button */}
        <Box pos="absolute" bottom={8} left={0} right={0} px={3}>
          <Flex
            align="center"
            p={3}
            mx={3}
            borderRadius="10px"
            cursor="pointer"
            transition=".2s ease"
            color={mutedText}
            _hover={{ bg: settingsHoverBg, color: logoColor }}
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
          <DrawerBody p={2}>
            <VStack spacing={1} align="stretch" mt={2}>
              <NavItem icon={FiHome} to="/dashboard">儀表板</NavItem>
              <NavItem icon={FiDatabase} to="/knowledge">知識庫</NavItem>
              <NavItem icon={FiMessageSquare} to="/chat">對話</NavItem>
              <NavItem icon={FiTrendingUp} to="/experiment">實驗室</NavItem>
              <NavItem icon={FiShare2} to="/graph-demo">知識圖譜</NavItem>
            </VStack>
            <Box px={2} mt={2}>
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
