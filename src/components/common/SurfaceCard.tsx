import { Card, type CardProps, useColorModeValue } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface SurfaceCardProps extends CardProps {
  children: ReactNode;
}

export default function SurfaceCard({ children, ...props }: SurfaceCardProps) {
  const bg = useColorModeValue('white', 'surface.800');
  const borderColor = useColorModeValue('surface.200', 'surface.700');
  const shadow = useColorModeValue('0 8px 24px rgba(17, 24, 39, 0.08)', '0 8px 30px rgba(2, 6, 23, 0.35)');

  return (
    <Card
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="12px"
      boxShadow={shadow}
      {...props}
    >
      {children}
    </Card>
  );
}
