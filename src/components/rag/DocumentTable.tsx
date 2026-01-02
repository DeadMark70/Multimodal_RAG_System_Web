
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Box
} from '@chakra-ui/react';
import { FiMoreVertical, FiTrash2, FiEye } from 'react-icons/fi';

interface Document {
    id: string;
    file_name: string;
    created_at: string;
    status: string | null;
    processing_step?: string | null;
}

interface DocumentTableProps {
    documents: Document[];
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}

const StatusBadge = ({ status, step }: { status: string | null, step?: string | null }) => {
    let colorScheme = 'gray';
    let label = status || '未知';

    if (status === 'indexed' || status === 'completed') {
        colorScheme = 'green';
        label = '已就緒';
    } else if (status === 'processing' || status === 'uploading') {
        colorScheme = 'blue';
        label = step ? `處理中: ${step}` : '處理中';
    } else if (status === 'failed') {
        colorScheme = 'red';
        label = '失敗';
    }

    return (
        <Badge colorScheme={colorScheme} borderRadius="full" px="2">
            {label}
        </Badge>
    );
};

export default function DocumentTable({ documents, onDelete, onView }: DocumentTableProps) {

    const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');

    if (documents.length === 0) {
        return <Box p={4} textAlign="center" color="gray.500">尚無文件</Box>;;
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
                <StatusBadge status={doc.status} step={doc.processing_step ?? undefined} />
            </Td>
            <Td isNumeric>
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Options"
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="sm"
                />
                <MenuList>
                  <MenuItem icon={<FiEye />} onClick={() => onView(doc.id)}>
                    檢視詳情
                  </MenuItem>
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
