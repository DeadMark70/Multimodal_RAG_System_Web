import { Box, Text, Flex, Avatar, useColorModeValue } from '@chakra-ui/react';
import { FiUser, FiCpu } from 'react-icons/fi';
import type { Citation, EvaluationMetrics } from '../../types/rag';
import { MetricsBadge } from './MetricsBadge';

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    sources?: Citation[];
    metrics?: EvaluationMetrics;
    onCitationClick?: (citation: Citation) => void;
}

export default function MessageBubble({ role, content, sources, metrics, onCitationClick }: MessageBubbleProps) {
    const isUser = role === 'user';
    const align = isUser ? 'flex-end' : 'flex-start';
    
    // Modern Gradient for User, Clean White/Dark for AI
    const bg = isUser 
        ? 'linear-gradient(135deg, #4318FF 0%, #774FFF 100%)' 
        : useColorModeValue('white', '#1B254B');
        
    const textColor = isUser ? 'white' : useColorModeValue('navy.700', 'white');
    
    // Soft shadow for depth
    const boxShadow = isUser 
        ? '0px 4px 12px rgba(67, 24, 255, 0.3)' 
        : '0px 2px 8px rgba(0, 0, 0, 0.05)';

    return (
        <Flex direction="column" align={align} w="100%" mb={6}>
            <Flex maxW="85%" direction={isUser ? 'row-reverse' : 'row'} gap={4}>
                {/* Avatar */}
                <Avatar 
                    size="sm" 
                    icon={isUser ? <FiUser /> : <FiCpu />} 
                    bg={isUser ? 'transparent' : 'transparent'} 
                    color={isUser ? 'brand.500' : 'brand.500'} 
                    border="1px solid"
                    borderColor={isUser ? 'transparent' : 'brand.100'}
                    src={isUser ? undefined : "/ai-avatar.png"} // Fallback to icon if src fails
                    name={isUser ? "User" : "AI Assistant"}
                    display={{ base: 'none', md: 'flex' }}
                />
                
                <Box
                    bg={bg}
                    color={textColor}
                    px={6}
                    py={5}
                    borderRadius="20px"
                    borderTopRightRadius={isUser ? '4px' : '20px'}
                    borderTopLeftRadius={!isUser ? '4px' : '20px'}
                    boxShadow={boxShadow}
                    position="relative"
                >
                    {/* Message Content */}
                    <Text fontSize="md" whiteSpace="pre-wrap" lineHeight="1.6">
                        {content}
                    </Text>

                    {/* AI Metrics Badge (if available) */}
                    {!isUser && metrics && (
                        <Box mt={3}>
                            <MetricsBadge metrics={metrics} />
                        </Box>
                    )}

                    {/* Citations (Glassmorphism Tags) */}
                    {sources && sources.length > 0 && (
                         <Flex wrap="wrap" gap={2} mt={3}>
                            {sources.map((source, idx) => (
                                <Box 
                                    key={idx}
                                    as="button"
                                    onClick={() => onCitationClick?.(source)}
                                    fontSize="xs"
                                    fontWeight="bold"
                                    bg={isUser ? 'whiteAlpha.300' : 'brand.50'}
                                    color={isUser ? 'white' : 'brand.600'}
                                    border="1px solid"
                                    borderColor={isUser ? 'transparent' : 'brand.100'}
                                    px={3} py={1.5}
                                    borderRadius="lg"
                                    _hover={{ opacity: 0.8, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                                    transition="all 0.2s"
                                >
                                    📄 {source.filename}
                                </Box>
                            ))}
                         </Flex>
                    )}
                </Box>
            </Flex>
        </Flex>
    );
}
