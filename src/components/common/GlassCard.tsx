import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';

export default function GlassCard(props: BoxProps) {
  const bg = useColorModeValue('glass.100', 'glass.600');
  const borderColor = useColorModeValue('glass.200', 'glass.300');

  return (
    <Box
      bg={bg}
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="24px"
      boxShadow="lg"
      {...props}
    />
  );
}
