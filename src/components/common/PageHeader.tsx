
import { Box, Heading, Text, useColorModeValue } from '@chakra-ui/react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
    const textColor = useColorModeValue('gray.800', 'white');
    const subTextColor = useColorModeValue('gray.500', 'gray.400');

    return (
        <Box mb={6}>
            <Text color={subTextColor} fontSize="sm" fontWeight="medium" mb={1}>
                頁面 / {title}
            </Text>
            <Heading color={textColor} fontSize="2xl" fontWeight="bold">
                {title}
            </Heading>
            {subtitle && <Text color={subTextColor} mt={2}>{subtitle}</Text>}
        </Box>
    );
}
