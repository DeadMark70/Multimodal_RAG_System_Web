/**
 * KnowledgeGraph - 知識圖譜力導向圖元件
 *
 * 使用 react-force-graph-2d 展示實體與關係的網狀結構
 *
 * @remarks
 * - 節點著色基於社群分組 (group)
 * - 點擊節點觸發 callback 更新 SessionStore
 * - 支援縮放/平移
 * - 內建 Mock Data 用於開發
 */

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { Box, useColorModeValue, Text, VStack, IconButton, HStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiPlus, FiMinus, FiCpu } from 'react-icons/fi';
import type { GraphData, GraphNode, GraphLink } from '../../types/graph';
import { useSessionActions } from '../../stores';
import GlassPane from '../common/GlassPane';

// ========== Mock Data ==========

const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    { id: 'Machine Learning', group: 1, val: 12, desc: '機器學習是 AI 的核心分支', type: 'Concept' },
    { id: 'Deep Learning', group: 1, val: 10, desc: '使用神經網路的機器學習方法', type: 'Concept' },
    { id: 'Neural Networks', group: 1, val: 8, desc: '模仿生物神經元的計算模型', type: 'Concept' },
    { id: 'Transformer', group: 1, val: 9, desc: '注意力機制為核心的架構', type: 'Model' },
    { id: 'BERT', group: 1, val: 7, desc: 'Bidirectional Encoder Representations', type: 'Model' },
    { id: 'GPT', group: 1, val: 8, desc: 'Generative Pre-trained Transformer', type: 'Model' },
    { id: 'Natural Language Processing', group: 2, val: 10, desc: '自然語言處理技術', type: 'Concept' },
    { id: 'Text Embedding', group: 2, val: 6, desc: '將文字轉換為向量表示', type: 'Technique' },
    { id: 'Semantic Search', group: 2, val: 7, desc: '基於語義的搜尋技術', type: 'Technique' },
    { id: 'Tokenization', group: 2, val: 5, desc: '文字分詞處理', type: 'Technique' },
    { id: 'RAG', group: 3, val: 11, desc: 'Retrieval-Augmented Generation', type: 'Framework' },
    { id: 'Vector Database', group: 3, val: 8, desc: '向量資料庫如 FAISS, Pinecone', type: 'Technology' },
    { id: 'Knowledge Graph', group: 3, val: 9, desc: '知識圖譜結構化知識', type: 'Technology' },
    { id: 'GraphRAG', group: 3, val: 8, desc: '結合圖譜的 RAG 方法', type: 'Framework' },
    { id: 'Chunking', group: 3, val: 5, desc: '文件分塊策略', type: 'Technique' },
    { id: 'OpenAI', group: 4, val: 9, desc: 'AI 研究公司', type: 'Organization' },
    { id: 'Google', group: 4, val: 9, desc: '科技公司', type: 'Organization' },
    { id: 'Microsoft', group: 4, val: 8, desc: '科技公司', type: 'Organization' },
  ],
  links: [
    { source: 'Machine Learning', target: 'Deep Learning', label: 'includes' },
    { source: 'Deep Learning', target: 'Neural Networks', label: 'uses' },
    { source: 'Neural Networks', target: 'Transformer', label: 'evolved_to' },
    { source: 'Transformer', target: 'BERT', label: 'inspired' },
    { source: 'Transformer', target: 'GPT', label: 'inspired' },
    { source: 'Natural Language Processing', target: 'Text Embedding', label: 'uses' },
    { source: 'Natural Language Processing', target: 'Tokenization', label: 'requires' },
    { source: 'Text Embedding', target: 'Semantic Search', label: 'enables' },
    { source: 'RAG', target: 'Vector Database', label: 'uses' },
    { source: 'RAG', target: 'Knowledge Graph', label: 'can_use' },
    { source: 'Knowledge Graph', target: 'GraphRAG', label: 'enables' },
    { source: 'RAG', target: 'Chunking', label: 'requires' },
    { source: 'Deep Learning', target: 'Natural Language Processing', label: 'applied_to' },
    { source: 'BERT', target: 'Text Embedding', label: 'generates' },
    { source: 'GPT', target: 'RAG', label: 'powers' },
    { source: 'Semantic Search', target: 'RAG', label: 'component_of' },
    { source: 'OpenAI', target: 'GPT', label: 'created' },
    { source: 'Google', target: 'BERT', label: 'created' },
    { source: 'Google', target: 'Transformer', label: 'invented' },
    { source: 'Microsoft', target: 'OpenAI', label: 'invested_in' },
  ],
};

const COMMUNITY_COLORS = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6',
];

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

export interface KnowledgeGraphProps {
  data?: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  isLoading?: boolean;
  width?: number;
  height?: number;
}

export function KnowledgeGraph({
  data,
  onNodeClick,
  isLoading = false,
  width: propWidth,
  height: propHeight = 600,
}: KnowledgeGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<ForceGraphMethods<any> | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const actions = useSessionActions();

  // Theme colors
  const bgColor = useColorModeValue('#ffffff', '#1a202c');
  const textColor = useColorModeValue('#2d3748', '#e2e8f0');
  const linkColor = useColorModeValue('#a0aec0', '#4a5568');

  const graphData = useMemo(() => data ?? MOCK_GRAPH_DATA, [data]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getNodeColor = useCallback((node: { group?: number }) => {
    const groupIndex = (node.group ?? 0) % COMMUNITY_COLORS.length;
    return COMMUNITY_COLORS[groupIndex];
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((node: any) => {
      actions.setSelectedNodeId(node.id);
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }
      onNodeClick?.(node as GraphNode);
    },
    [actions, onNodeClick]
  );

  const handleZoomIn = () => {
    graphRef.current?.zoom((graphRef.current.zoom() || 1) * 1.2, 400);
  };

  const handleZoomOut = () => {
    graphRef.current?.zoom((graphRef.current.zoom() || 1) / 1.2, 400);
  };

  return (
    <Box ref={containerRef} w="full" h={propHeight ? `${propHeight}px` : "full"} minH="400px" position="relative" overflow="hidden" borderRadius="xl" bg={bgColor}>
      {!isLoading && (dimensions.width > 0 || propWidth) && (
        <ForceGraph2D
          ref={graphRef}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          graphData={graphData as any}
          width={dimensions.width || propWidth || 800}
          height={dimensions.height || propHeight || 600}
          backgroundColor={bgColor}
          nodeLabel={(node: { id?: string; desc?: string }) => `${node.id ?? ''}\n${node.desc ?? ''}`}
          nodeColor={getNodeColor}
          nodeRelSize={6}
          nodeVal={(node: { val?: number }) => node.val ?? 5}
          linkColor={() => linkColor}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.9}
          linkLabel={(link: GraphLink) => link.label ?? ''}
          onNodeClick={handleNodeClick}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onNodeDragEnd={(node: any) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.id ?? '';
            const fontSize = 12 / globalScale;
            const nodeSize = Math.sqrt(node.val ?? 5) * 4;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = getNodeColor(node);
            ctx.fill();
            if (globalScale > 0.7) {
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = textColor;
              ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + nodeSize + fontSize);
            }
          }}
          cooldownTicks={100}
          warmupTicks={50}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <Box position="absolute" inset="0" display="flex" alignItems="center" justifyContent="center" bg="blackAlpha.300" backdropFilter="blur(5px)" zIndex={20}>
            <VStack spacing={4}>
                <Box as={FiCpu} size="40px" color="brand.500" animation={`${pulse} 2s infinite`} />
                <Text fontWeight="bold" color="white" textShadow="0 0 10px rgba(0,0,0,0.5)">Building Graph...</Text>
            </VStack>
        </Box>
      )}

      {/* Glass Controls */}
      <GlassPane position="absolute" bottom="4" right="4" p="2" borderRadius="lg" zIndex="10">
        <VStack spacing="2">
            <IconButton aria-label="Zoom In" icon={<FiPlus />} onClick={handleZoomIn} size="sm" variant="ghost" />
            <IconButton aria-label="Zoom Out" icon={<FiMinus />} onClick={handleZoomOut} size="sm" variant="ghost" />
        </VStack>
      </GlassPane>
    </Box>
  );
}

export default KnowledgeGraph;
