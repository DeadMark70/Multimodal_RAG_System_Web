import { Box, Flex, Stat, StatHelpText, StatLabel, StatNumber, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import SurfaceCard from './SurfaceCard';

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconType;
  iconBg?: string;
  iconColor?: string;
}

export default function MetricCard({
  label,
  value,
  hint,
  icon,
  iconBg,
  iconColor,
}: MetricCardProps) {
  const defaultIconBg = useColorModeValue('brand.50', 'brand.900');
  const defaultIconColor = useColorModeValue('brand.500', 'brand.300');
  const subTextColor = useColorModeValue('surface.500', 'surface.300');
  const textColor = useColorModeValue('surface.700', 'white');

  return (
    <SurfaceCard>
      <Flex align="center" gap={4} p={4}>
        <Box
          p={2.5}
          borderRadius="10px"
          bg={iconBg ?? defaultIconBg}
          color={iconColor ?? defaultIconColor}
        >
          <Icon as={icon} boxSize={5} />
        </Box>
        <Stat>
          <StatLabel color={subTextColor} fontSize="sm" fontWeight="600">
            {label}
          </StatLabel>
          <StatNumber color={textColor} fontSize="2xl" lineHeight={1.1}>
            {value}
          </StatNumber>
          {hint && (
            <StatHelpText mb={0}>
              <Text as="span" color={subTextColor} fontSize="xs">
                {hint}
              </Text>
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </SurfaceCard>
  );
}
