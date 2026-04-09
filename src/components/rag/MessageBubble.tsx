/**
 * MessageBubble 元件
 * 
 * 聊天訊息氣泡，支援：
 * - 共用 MarkdownContent 渲染
 * - 圖片點擊放大預覽
 * - 評估指標顯示 (MetricsBadge)
 * - 引用來源標籤
 * 
 * @version 3.0.0
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Text,
  Flex,
  Avatar,
  useColorModeValue,
  useDisclosure,
  Button,
  Collapse,
} from '@chakra-ui/react';
import { FiUser, FiCpu, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { Citation, EvaluationMetrics } from '../../types/rag';
import MarkdownContent from '../common/MarkdownContent';
import { MetricsBadge } from './MetricsBadge';
import ImagePreviewModal from '../common/ImagePreviewModal';
import { isAllowedMarkdownTarget, resolveApiUrl } from '../../services/networkPolicy';

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
  const cleanSrc = src.replace(/\\/g, '/');
  
  // 已經是絕對 URL
  if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
    return isAllowedMarkdownTarget(cleanSrc) ? cleanSrc : '';
  }
  
  // 相對路徑 /uploads/...
  if (cleanSrc.startsWith('/uploads/')) {
    const resolved = resolveApiUrl(API_BASE_URL, cleanSrc);
    return isAllowedMarkdownTarget(resolved) ? resolved : '';
  }
  
  // 相對路徑 uploads/... (無前導斜線)
  if (cleanSrc.startsWith('uploads/')) {
    const resolved = resolveApiUrl(API_BASE_URL, `/${cleanSrc}`);
    return isAllowedMarkdownTarget(resolved) ? resolved : '';
  }
  
  // Fallback: 嘗試拼接
  const resolved = resolveApiUrl(API_BASE_URL, `/uploads/${cleanSrc}`);
  return isAllowedMarkdownTarget(resolved) ? resolved : '';
}

function transformLinkUrl(href: string | undefined): string | undefined {
  if (!href) {
    return undefined;
  }

  const baseOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : API_BASE_URL;
  const resolved = resolveApiUrl(baseOrigin, href);
  if (!isAllowedMarkdownTarget(resolved)) {
    return undefined;
  }
  return resolved;
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
  const [showSources, setShowSources] = useState(false);
  
  // 圖片預覽狀態
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [previewImage, setPreviewImage] = useState({ src: '', alt: '' });
  
  // 開啟圖片預覽
  const handleImageClick = useCallback((src: string, alt: string) => {
    setPreviewImage({ src, alt });
    onOpen();
  }, [onOpen]);
  
  // Modern Gradient for User, Clean White/Dark for AI
  const aiBg = useColorModeValue('gray.50', '#1E293B');
  const bg = isUser 
    ? 'linear-gradient(135deg, #4318FF 0%, #774FFF 100%)' 
    : aiBg;
      
  const aiTextColor = useColorModeValue('navy.700', 'white');
  const textColor = isUser ? 'white' : aiTextColor;
  const aiBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const linkColor = useColorModeValue('brand.500', 'brand.300');
  const chipBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const chipBorderColor = useColorModeValue('brand.100', 'whiteAlpha.200');
  
  // Soft shadow for depth
  const boxShadow = isUser 
    ? '0px 4px 12px rgba(67, 24, 255, 0.3)' 
    : '0px 8px 24px rgba(15, 23, 42, 0.08)';

  return (
    <>
      <Flex direction="column" align={align} w="100%" mb={6}>
        <Flex
          maxW={{ base: '100%', md: '85%' }}
          minW={0}
          direction={isUser ? 'row-reverse' : 'row'}
          gap={4}
        >
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
          maxW="100%"
          minW={0}
          borderRadius="24px"
          borderTopRightRadius={isUser ? '8px' : '24px'}
          borderTopLeftRadius={!isUser ? '8px' : '24px'}
          boxShadow={boxShadow}
          border={isUser ? 'none' : '1px solid'}
          borderColor={isUser ? 'transparent' : aiBorderColor}
          position="relative"
          sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
        >
            {/* Message Content - Markdown 渲染 (僅 AI 回覆) */}
            {isUser ? (
              <Text
                fontSize="md"
                whiteSpace="pre-wrap"
                lineHeight="1.6"
                sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                {content}
              </Text>
            ) : (
              <MarkdownContent
                className="markdown-content"
                content={content}
                variant="chat"
                resolveImageSrc={transformImageUrl}
                resolveLinkHref={transformLinkUrl}
                onImageClick={handleImageClick}
              />
            )}

            {/* AI Metrics Badge (if available) */}
            {!isUser && metrics && (
              <Box mt={3}>
                <MetricsBadge metrics={metrics} />
              </Box>
            )}

            {/* Citations */}
            {!isUser && sources && sources.length > 0 && (
              <Box mt={4} pt={3} borderTop="1px solid" borderColor={aiBorderColor}>
                <Button
                  size="xs"
                  variant="ghost"
                  px={0}
                  h="auto"
                  fontWeight="semibold"
                  color={linkColor}
                  rightIcon={showSources ? <FiChevronUp /> : <FiChevronDown />}
                  onClick={() => setShowSources((value) => !value)}
                  aria-label="切換來源顯示"
                >
                  來源 {sources.length}
                </Button>
                <Collapse in={showSources} animateOpacity>
                  <Flex wrap="wrap" gap={2} mt={3}>
                    {sources.map((source, idx) => (
                      <Box
                        key={`${source.doc_id}-${idx}`}
                        as="button"
                        type="button"
                        onClick={() => onCitationClick?.(source)}
                        fontSize="xs"
                        fontWeight="bold"
                        bg={chipBg}
                        color={isUser ? 'white' : 'brand.600'}
                        border="1px solid"
                        borderColor={isUser ? 'transparent' : chipBorderColor}
                        px={3}
                        py={1.5}
                        borderRadius="full"
                        maxW="100%"
                        whiteSpace="normal"
                        textAlign="left"
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        _hover={{ opacity: 0.85, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                        transition="transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease"
                      >
                        📄 {source.filename ?? source.doc_id}
                      </Box>
                    ))}
                  </Flex>
                </Collapse>
              </Box>
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
