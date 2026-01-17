/**
 * MessageBubble 元件
 * 
 * 聊天訊息氣泡，支援：
 * - Markdown 渲染 (react-markdown + rehype-sanitize)
 * - 圖片點擊放大預覽
 * - 評估指標顯示 (MetricsBadge)
 * - 引用來源標籤
 * 
 * @version 3.0.0
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Text, 
  Flex, 
  Avatar, 
  Image,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { FiUser, FiCpu } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import type { Citation, EvaluationMetrics } from '../../types/rag';
import { MetricsBadge } from './MetricsBadge';
import ImagePreviewModal from '../common/ImagePreviewModal';

// ========== 常數定義 ==========

/** API 基礎 URL (用於圖片路徑轉換) */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ========== 型別定義 ==========

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  metrics?: EvaluationMetrics;
  onCitationClick?: (citation: Citation) => void;
}

// ========== 輔助函數 ==========

/**
 * 轉換圖片 URL
 * - 處理 Windows 反斜線路徑
 * - 處理相對路徑轉絕對路徑
 * - 保留已經是絕對路徑的 URL
 */
function transformImageUrl(src: string | undefined): string {
  if (!src) return '';
  
  // 處理 Windows 反斜線 (前端再防一次更安全)
  let cleanSrc = src.replace(/\\/g, '/');
  
  // 已經是絕對 URL
  if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
    return cleanSrc;
  }
  
  // 相對路徑 /uploads/...
  if (cleanSrc.startsWith('/uploads/')) {
    return `${API_BASE_URL}${cleanSrc}`;
  }
  
  // 相對路徑 uploads/... (無前導斜線)
  if (cleanSrc.startsWith('uploads/')) {
    return `${API_BASE_URL}/${cleanSrc}`;
  }
  
  // Fallback: 嘗試拼接
  return `${API_BASE_URL}/uploads/${cleanSrc}`;
}

// ========== 元件 ==========

export default function MessageBubble({ 
  role, 
  content, 
  sources, 
  metrics, 
  onCitationClick 
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const align = isUser ? 'flex-end' : 'flex-start';
  
  // 圖片預覽狀態
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [previewImage, setPreviewImage] = useState({ src: '', alt: '' });
  
  // 開啟圖片預覽
  const handleImageClick = useCallback((src: string, alt: string) => {
    setPreviewImage({ src, alt });
    onOpen();
  }, [onOpen]);
  
  // Modern Gradient for User, Clean White/Dark for AI
  const bg = isUser 
    ? 'linear-gradient(135deg, #4318FF 0%, #774FFF 100%)' 
    : useColorModeValue('white', '#1B254B');
      
  const textColor = isUser ? 'white' : useColorModeValue('navy.700', 'white');
  const linkColor = useColorModeValue('brand.500', 'brand.300');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  
  // Soft shadow for depth
  const boxShadow = isUser 
    ? '0px 4px 12px rgba(67, 24, 255, 0.3)' 
    : '0px 2px 8px rgba(0, 0, 0, 0.05)';

  // Markdown 自定義元件
  const markdownComponents: Components = useMemo(() => ({
    // 圖片元件：支援點擊放大
    img: ({ src, alt, ...props }) => {
      const transformedSrc = transformImageUrl(src);
      return (
        <Image
          src={transformedSrc}
          alt={alt || '圖片'}
          borderRadius="md"
          maxH="300px"
          my={2}
          cursor="zoom-in"
          transition="transform 0.2s"
          _hover={{ transform: 'scale(1.02)' }}
          onClick={() => handleImageClick(transformedSrc, alt || '圖片')}
          loading="lazy"
          fallbackSrc="https://via.placeholder.com/300x200?text=Loading..."
          {...props}
        />
      );
    },
    // 連結元件
    a: ({ href, children, ...props }) => (
      <Text
        as="a"
        href={href}
        color={linkColor}
        textDecoration="underline"
        _hover={{ opacity: 0.8 }}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </Text>
    ),
    // 程式碼區塊
    code: ({ children, className, ...props }) => {
      const isInline = !className;
      return isInline ? (
        <Text
          as="code"
          bg={codeBg}
          px={1.5}
          py={0.5}
          borderRadius="md"
          fontSize="sm"
          fontFamily="mono"
          {...props}
        >
          {children}
        </Text>
      ) : (
        <Box
          as="pre"
          bg={codeBg}
          p={4}
          borderRadius="md"
          overflowX="auto"
          my={2}
          {...props}
        >
          <Text as="code" fontSize="sm" fontFamily="mono">
            {children}
          </Text>
        </Box>
      );
    },
    // 段落
    p: ({ children, ...props }) => (
      <Text mb={2} lineHeight="1.7" {...props}>
        {children}
      </Text>
    ),
    // 標題
    h1: ({ children, ...props }) => (
      <Text as="h1" fontSize="xl" fontWeight="bold" mt={4} mb={2} {...props}>
        {children}
      </Text>
    ),
    h2: ({ children, ...props }) => (
      <Text as="h2" fontSize="lg" fontWeight="bold" mt={3} mb={2} {...props}>
        {children}
      </Text>
    ),
    h3: ({ children, ...props }) => (
      <Text as="h3" fontSize="md" fontWeight="bold" mt={2} mb={1} {...props}>
        {children}
      </Text>
    ),
    // 列表
    ul: ({ children, ...props }) => (
      <Box as="ul" pl={5} my={2} {...props}>
        {children}
      </Box>
    ),
    ol: ({ children, ...props }) => (
      <Box as="ol" pl={5} my={2} {...props}>
        {children}
      </Box>
    ),
    li: ({ children, ...props }) => (
      <Box as="li" mb={1} {...props}>
        {children}
      </Box>
    ),
  }), [linkColor, codeBg, handleImageClick]);

  return (
    <>
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
            src={isUser ? undefined : "/ai-avatar.png"}
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
            {/* Message Content - Markdown 渲染 (僅 AI 回覆) */}
            {isUser ? (
              <Text fontSize="md" whiteSpace="pre-wrap" lineHeight="1.6">
                {content}
              </Text>
            ) : (
              <Box className="markdown-content">
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </Box>
            )}

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

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={isOpen}
        onClose={onClose}
        imageSrc={previewImage.src}
        imageAlt={previewImage.alt}
      />
    </>
  );
}
