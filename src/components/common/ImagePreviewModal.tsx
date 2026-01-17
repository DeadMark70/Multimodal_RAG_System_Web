/**
 * ImagePreviewModal 元件
 * 
 * 圖片放大預覽 Modal
 * - 支援點擊背景或按 ESC 關閉
 * - 支援圖片縮放
 * 
 * @version 3.0.0
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';

// ========== 型別定義 ==========

interface ImagePreviewModalProps {
  /** 是否開啟 */
  isOpen: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 圖片 URL */
  imageSrc: string;
  /** 圖片替代文字 */
  imageAlt?: string;
}

// ========== 元件 ==========

export default function ImagePreviewModal({
  isOpen,
  onClose,
  imageSrc,
  imageAlt = '圖片預覽',
}: ImagePreviewModalProps) {
  const overlayBg = useColorModeValue('blackAlpha.700', 'blackAlpha.800');
  const contentBg = useColorModeValue('white', 'gray.800');

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="6xl"
      isCentered
      motionPreset="scale"
    >
      <ModalOverlay bg={overlayBg} backdropFilter="blur(4px)" />
      <ModalContent 
        bg={contentBg} 
        borderRadius="xl" 
        overflow="hidden"
        maxW="90vw"
        maxH="90vh"
      >
        <ModalCloseButton 
          color="white" 
          bg="blackAlpha.500" 
          borderRadius="full"
          _hover={{ bg: 'blackAlpha.700' }}
          zIndex={10}
        />
        <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
          <Image
            src={imageSrc}
            alt={imageAlt}
            maxW="100%"
            maxH="85vh"
            objectFit="contain"
            loading="lazy"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// ========== 匯出 ==========

export type { ImagePreviewModalProps };
