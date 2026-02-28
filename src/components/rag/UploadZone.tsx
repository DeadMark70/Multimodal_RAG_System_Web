import { useState, type DragEvent, type ChangeEvent } from 'react';
import { Box, Text, VStack, Icon, useColorModeValue, useToast, Spinner } from '@chakra-ui/react';
import { FiUploadCloud } from 'react-icons/fi';
// In a real app, use react-dropzone
// import { useDropzone } from 'react-dropzone';

interface UploadZoneProps {
    onUpload: (file: File) => Promise<unknown>;
}

export default function UploadZone({ onUpload }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const bg = useColorModeValue('white', '#111C44');
    const borderColor = useColorModeValue('gray.300', 'gray.600');
    const activeBorderColor = 'brand.500';
    const toast = useToast();

    // Mock Drag and Drop since valid react-dropzone setup requires more boilerplate for `onDrop`
    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            void handleUpload(files[0]);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
             toast({
                title: '檔案格式錯誤',
                description: '請上傳 PDF 檔案。',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        setIsUploading(true);

        try {
            await onUpload(file);
        } catch {
            // 錯誤提示交由上層 mutation hook 統一處理，避免重複 toast
        } finally {
            setIsUploading(false);
        }
    };

  return (
    <Box
      p={10}
      bg={isDragging ? 'brand.50' : bg}
      border="2px dashed"
      borderColor={isDragging ? activeBorderColor : borderColor}
      borderRadius="xl"
      textAlign="center"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      cursor="pointer"
      position="relative"
      transition="all 0.3s ease"
      transform={isDragging ? 'scale(1.02)' : 'scale(1)'}
      _hover={{ borderColor: activeBorderColor, transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
        <input 
            type="file" 
            accept="application/pdf"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            onChange={handleChange}
            disabled={isUploading}
        />
        
      {isUploading ? (
          <VStack spacing={4}>
              <Spinner size="lg" color="brand.500" />
              <Text fontWeight="bold">上傳中，正在送出檔案...</Text>
          </VStack>
      ) : (
        <VStack spacing={2}>
            <Icon as={FiUploadCloud} boxSize={12} color={isDragging ? 'brand.500' : 'gray.400'} />
            <Text fontSize="lg" fontWeight="bold" color="brand.500">
            上傳 PDF 檔案
            </Text>
            <Text color="gray.500" fontSize="sm">
            拖放檔案或點擊選擇
            </Text>
        </VStack>
      )}
    </Box>
  );
}
