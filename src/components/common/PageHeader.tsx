
import { Badge, Box, Heading, HStack, Text, useColorModeValue } from '@chakra-ui/react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    variant?: 'default' | 'dashboard';
}

export default function PageHeader({ title, subtitle, variant = 'default' }: PageHeaderProps) {
    const textColor = useColorModeValue('surface.700', 'white');
    const subTextColor = useColorModeValue('surface.500', 'surface.300');
    const breadcrumbColor = useColorModeValue('surface.500', 'surface.300');
    const badgeBg = useColorModeValue('brand.50', 'brand.900');
    const badgeColor = useColorModeValue('brand.600', 'brand.200');

    return (
        <Box mb={6}>
            <Text color={breadcrumbColor} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                頁面 / {title}
            </Text>
            {variant === 'dashboard' ? (
                <HStack align="flex-start" justify="space-between" flexWrap="wrap" gap={3}>
                    <Box>
                        <Heading color={textColor} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" letterSpacing="-0.02em">
                            {title}
                        </Heading>
                        {subtitle && <Text color={subTextColor} mt={2}>{subtitle}</Text>}
                    </Box>
                    <Badge
                        px={3}
                        py={1}
                        borderRadius="full"
                        bg={badgeBg}
                        color={badgeColor}
                        fontWeight="700"
                        textTransform="none"
                    >
                        Agentic RAG
                    </Badge>
                </HStack>
            ) : (
                <>
                    <Heading color={textColor} fontSize="2xl" fontWeight="700" letterSpacing="-0.01em">
                        {title}
                    </Heading>
                    {subtitle && <Text color={subTextColor} mt={2}>{subtitle}</Text>}
                </>
            )}
        </Box>
    );
}
