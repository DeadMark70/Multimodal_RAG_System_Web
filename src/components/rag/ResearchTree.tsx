import { Box, Text, VStack, HStack, useColorModeValue, Badge } from '@chakra-ui/react';
import GlassCard from '../common/GlassCard';
import { motion } from 'framer-motion';

interface Task {
  id: number;
  question: string;
  status: string;
  task_type?: 'rag' | 'graph';
}

interface Plan {
  original_question: string;
  sub_tasks: Task[];
}

export default function ResearchTree({ plan }: { plan: Plan }) {
  const lineColor = useColorModeValue('gray.300', 'gray.600');

  return (
    <VStack spacing={0} position="relative" w="full" py={4}>
      {/* Root Node */}
      <Box 
        as={motion.div}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        zIndex={2}
      >
        <GlassCard p={4} mb={8} textAlign="center" borderTop="4px solid" borderColor="brand.500">
          <Text fontWeight="bold" fontSize="md">{plan.original_question}</Text>
        </GlassCard>
      </Box>

      {/* Connecting Line (Vertical from Root) */}
      <Box 
        position="absolute" 
        top="60px" 
        bottom="20px" 
        left="50%" 
        w="2px" 
        bg={lineColor} 
        zIndex={0} 
      />

      {/* Sub Tasks Grid */}
      <HStack spacing={4} align="start" w="full" justify="center" flexWrap="wrap" px={4}>
        {plan.sub_tasks.map((task, index) => (
          <Box
            as={motion.div}
            key={task.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 } as any}
            zIndex={1}
            maxW="250px"
            minW="180px"
            my={2}
          >
             {/* Connection to center (simplified visual trick) */}
             <Box 
                position="absolute" 
                top="-20px" 
                left="50%" 
                h="20px" 
                w="2px" 
                bg={lineColor} 
             />
             
             <GlassCard p={3} borderLeft="4px solid" borderColor={getStatusColor(task.status)} _hover={{ transform: 'translateY(-2px)' }} transition="0.2s">
                <HStack justify="space-between" mb={2}>
                    <Badge size="xs" colorScheme={task.task_type === 'rag' ? 'blue' : 'purple'}>
                        {task.task_type === 'rag' ? 'RAG' : 'GRAPH'}
                    </Badge>
                    <StatusBadge status={task.status} />
                </HStack>
                <Text fontSize="sm" noOfLines={3}>{task.question}</Text>
             </GlassCard>
          </Box>
        ))}
      </HStack>
    </VStack>
  );
}

function getStatusColor(status: string) {
    if (status === 'done') return 'green.400';
    if (status === 'running') return 'blue.400';
    if (status === 'error') return 'red.400';
    return 'gray.400';
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'done') return <Badge colorScheme="green">完成</Badge>;
    if (status === 'running') return <Badge colorScheme="blue">執行中</Badge>;
    if (status === 'error') return <Badge colorScheme="red">錯誤</Badge>;
    return <Badge colorScheme="gray">等待</Badge>;
}
