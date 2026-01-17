import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';

export default function GlassPane(props: BoxProps) {
  const bg = useColorModeValue('glass.100', 'glass.900');

  return (
    <Box
      bg={bg}
      backdropFilter="blur(16px)"
      {...props}
    />
  );
}
