import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiFileText, FiGlobe, FiMoreVertical, FiTrash2, FiZap } from 'react-icons/fi';

interface Document {
  id: string;
  file_name: string;
  created_at: string;
  status: string | null;
  processing_step?: string | null;
  has_original_pdf: boolean;
  has_translated_pdf: boolean;
  can_translate: boolean;
}

interface DocumentTableProps {
  documents: Document[];
  onDelete: (id: string) => void;
  onOpenOriginal: (id: string) => void;
  onOpenTranslated: (id: string) => void;
  onTranslate: (id: string) => void;
}

const StatusBadge = ({
  status,
  step,
  hasTranslatedPdf,
}: {
  status: string | null;
  step?: string | null;
  hasTranslatedPdf: boolean;
}) => {
  let colorScheme = 'gray';
  let label = status || '未知';

  if (hasTranslatedPdf) {
    colorScheme = 'green';
    label = step === 'indexed' ? '已索引 / 已翻譯' : '已翻譯';
  } else if (step === 'ocr_completed') {
    colorScheme = 'blue';
    label = 'OCR 已完成';
  } else if (step === 'indexing' || step === 'image_analysis' || step === 'graph_indexing') {
    colorScheme = 'cyan';
    label = '索引中';
  } else if (step === 'indexed') {
    colorScheme = 'green';
    label = '已索引';
  } else if (status === 'processing' || status === 'uploading' || step === 'ocr') {
    colorScheme = 'blue';
    label = step ? `處理中: ${step}` : '處理中';
  } else if (status === 'failed') {
    colorScheme = 'red';
    label = '失敗';
  } else if (status === 'completed_with_pdf_error') {
    colorScheme = 'orange';
    label = '翻譯 PDF 失敗';
  }

  return (
    <Badge colorScheme={colorScheme} borderRadius="full" px="2">
      {label}
    </Badge>
  );
};

export default function DocumentTable({
  documents,
  onDelete,
  onOpenOriginal,
  onOpenTranslated,
  onTranslate,
}: DocumentTableProps) {
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  if (documents.length === 0) {
    return <Box p={4} textAlign="center" color="gray.500">尚無文件</Box>;
  }

  return (
    <Table variant="simple">
      <Thead>
        <Tr>
          <Th>檔案名稱</Th>
          <Th>上傳日期</Th>
          <Th>狀態</Th>
          <Th isNumeric>操作</Th>
        </Tr>
      </Thead>
      <Tbody>
        {documents.map((doc) => (
          <Tr key={doc.id} _hover={{ bg: hoverBg }}>
            <Td fontWeight="medium">{doc.file_name}</Td>
            <Td fontSize="sm">{new Date(doc.created_at).toLocaleDateString()}</Td>
            <Td>
              <StatusBadge
                status={doc.status}
                step={doc.processing_step ?? undefined}
                hasTranslatedPdf={doc.has_translated_pdf}
              />
            </Td>
            <Td isNumeric>
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label={`文件操作 ${doc.file_name}`}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="sm"
                />
                <MenuList>
                  {doc.has_original_pdf && (
                    <MenuItem icon={<FiFileText />} onClick={() => onOpenOriginal(doc.id)}>
                      開啟原始 PDF
                    </MenuItem>
                  )}
                  {doc.has_translated_pdf && (
                    <MenuItem icon={<FiGlobe />} onClick={() => onOpenTranslated(doc.id)}>
                      開啟翻譯 PDF
                    </MenuItem>
                  )}
                  {doc.can_translate && (
                    <MenuItem icon={<FiZap />} onClick={() => onTranslate(doc.id)}>
                      翻譯
                    </MenuItem>
                  )}
                  <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => onDelete(doc.id)}>
                    刪除
                  </MenuItem>
                </MenuList>
              </Menu>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
