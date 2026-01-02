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

import { useRef, useCallback, useMemo } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { Box, useColorModeValue, Text, VStack, Spinner } from '@chakra-ui/react';
import type { GraphData, GraphNode, GraphLink } from '../../types/graph';
import { useSessionActions } from '../../stores';

// ========== Mock Data ==========

const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    // AI & ML 社群 (group: 1)
    { id: 'Machine Learning', group: 1, val: 12, desc: '機器學習是 AI 的核心分支', type: 'Concept' },
    { id: 'Deep Learning', group: 1, val: 10, desc: '使用神經網路的機器學習方法', type: 'Concept' },
    { id: 'Neural Networks', group: 1, val: 8, desc: '模仿生物神經元的計算模型', type: 'Concept' },
    { id: 'Transformer', group: 1, val: 9, desc: '注意力機制為核心的架構', type: 'Model' },
    { id: 'BERT', group: 1, val: 7, desc: 'Bidirectional Encoder Representations', type: 'Model' },
    { id: 'GPT', group: 1, val: 8, desc: 'Generative Pre-trained Transformer', type: 'Model' },

    // NLP 社群 (group: 2)
    { id: 'Natural Language Processing', group: 2, val: 10, desc: '自然語言處理技術', type: 'Concept' },
    { id: 'Text Embedding', group: 2, val: 6, desc: '將文字轉換為向量表示', type: 'Technique' },
    { id: 'Semantic Search', group: 2, val: 7, desc: '基於語義的搜尋技術', type: 'Technique' },
    { id: 'Tokenization', group: 2, val: 5, desc: '文字分詞處理', type: 'Technique' },

    // RAG 社群 (group: 3)
    { id: 'RAG', group: 3, val: 11, desc: 'Retrieval-Augmented Generation', type: 'Framework' },
    { id: 'Vector Database', group: 3, val: 8, desc: '向量資料庫如 FAISS, Pinecone', type: 'Technology' },
    { id: 'Knowledge Graph', group: 3, val: 9, desc: '知識圖譜結構化知識', type: 'Technology' },
    { id: 'GraphRAG', group: 3, val: 8, desc: '結合圖譜的 RAG 方法', type: 'Framework' },
    { id: 'Chunking', group: 3, val: 5, desc: '文件分塊策略', type: 'Technique' },

    // 組織/人物 社群 (group: 4)
    { id: 'OpenAI', group: 4, val: 9, desc: 'AI 研究公司', type: 'Organization' },
    { id: 'Google', group: 4, val: 9, desc: '科技公司', type: 'Organization' },
    { id: 'Microsoft', group: 4, val: 8, desc: '科技公司', type: 'Organization' },
  ],
  links: [
    // AI/ML 內部關係
    { source: 'Machine Learning', target: 'Deep Learning', label: 'includes' },
    { source: 'Deep Learning', target: 'Neural Networks', label: 'uses' },
    { source: 'Neural Networks', target: 'Transformer', label: 'evolved_to' },
    { source: 'Transformer', target: 'BERT', label: 'inspired' },
    { source: 'Transformer', target: 'GPT', label: 'inspired' },

    // NLP 內部關係
    { source: 'Natural Language Processing', target: 'Text Embedding', label: 'uses' },
    { source: 'Natural Language Processing', target: 'Tokenization', label: 'requires' },
    { source: 'Text Embedding', target: 'Semantic Search', label: 'enables' },

    // RAG 內部關係
    { source: 'RAG', target: 'Vector Database', label: 'uses' },
    { source: 'RAG', target: 'Knowledge Graph', label: 'can_use' },
    { source: 'Knowledge Graph', target: 'GraphRAG', label: 'enables' },
    { source: 'RAG', target: 'Chunking', label: 'requires' },

    // 跨社群關係
    { source: 'Deep Learning', target: 'Natural Language Processing', label: 'applied_to' },
    { source: 'BERT', target: 'Text Embedding', label: 'generates' },
    { source: 'GPT', target: 'RAG', label: 'powers' },
    { source: 'Semantic Search', target: 'RAG', label: 'component_of' },

    // 組織關係
    { source: 'OpenAI', target: 'GPT', label: 'created' },
    { source: 'Google', target: 'BERT', label: 'created' },
    { source: 'Google', target: 'Transformer', label: 'invented' },
    { source: 'Microsoft', target: 'OpenAI', label: 'invested_in' },
  ],
};

// ========== 社群顏色調色盤 ==========

const COMMUNITY_COLORS = [
  '#7C3AED', // Purple (default)
  '#3B82F6', // Blue - AI/ML
  '#10B981', // Green - NLP
  '#F59E0B', // Amber - RAG
  '#EF4444', // Red - Organizations
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
];

// ========== 介面定義 ==========

export interface KnowledgeGraphProps {
  /** 自訂圖譜資料 (不提供則使用 Mock Data) */
  data?: GraphData;
  /** 元件寬度 */
  width?: number;
  /** 元件高度 */
  height?: number;
  /** 節點點擊回調 */
  onNodeClick?: (node: GraphNode) => void;
  /** 是否載入中 */
  isLoading?: boolean;
}

// ========== 主元件 ==========

export function KnowledgeGraph({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  isLoading = false,
}: KnowledgeGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<ForceGraphMethods<any> | undefined>();
  const actions = useSessionActions();

  // Theme colors
  const bgColor = useColorModeValue('#ffffff', '#1a202c');
  const textColor = useColorModeValue('#2d3748', '#e2e8f0');
  const linkColor = useColorModeValue('#a0aec0', '#4a5568');

  // 使用 Mock Data 如果沒有提供資料
  const graphData = useMemo(() => data ?? MOCK_GRAPH_DATA, [data]);

  // 節點顏色
  const getNodeColor = useCallback((node: { group?: number }) => {
    const groupIndex = (node.group ?? 0) % COMMUNITY_COLORS.length;
    return COMMUNITY_COLORS[groupIndex];
  }, []);

  // 節點點擊處理
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((node: any) => {
      // 更新 Session Store
      actions.setSelectedNodeId(node.id);

      // 縮放到節點
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }

      // 觸發外部回調
      onNodeClick?.(node as GraphNode);
    },
    [actions, onNodeClick]
  );

  // 載入中狀態
  if (isLoading) {
    return (
      <Box
        w={width}
        h={height}
        bg={bgColor}
        borderRadius="xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="gray.500">載入知識圖譜中...</Text>
        </VStack>
      </Box>
    );
  }

  // 空資料狀態
  if (!graphData.nodes.length) {
    return (
      <Box
        w={width}
        h={height}
        bg={bgColor}
        borderRadius="xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={2}>
          <Text fontSize="lg" color="gray.500">
            尚無知識圖譜資料
          </Text>
          <Text fontSize="sm" color="gray.400">
            上傳文件後系統將自動建立
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      w={width}
      h={height}
      bg={bgColor}
      borderRadius="xl"
      overflow="hidden"
      position="relative"
    >
      <ForceGraph2D
        ref={graphRef}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graphData={graphData as any}
        width={width}
        height={height}
        backgroundColor={bgColor}
        // 節點設定
        nodeLabel={(node: { id?: string; desc?: string }) => `${node.id ?? ''}\n${node.desc ?? ''}`}
        nodeColor={getNodeColor}
        nodeRelSize={6}
        nodeVal={(node: { val?: number }) => node.val ?? 5}
        // 連結設定
        linkColor={() => linkColor}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        linkLabel={(link: GraphLink) => link.label ?? ''}
        // 互動
        onNodeClick={handleNodeClick}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNodeDragEnd={(node: any) => {
          // 固定拖曳後的位置
          node.fx = node.x;
          node.fy = node.y;
        }}
        // Canvas 繪製
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.id ?? '';
          const fontSize = 12 / globalScale;
          const nodeSize = Math.sqrt(node.val ?? 5) * 4;

          // 繪製節點圓形
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, nodeSize, 0, 2 * Math.PI);
          ctx.fillStyle = getNodeColor(node);
          ctx.fill();

          // 繪製標籤 (縮放夠大時)
          if (globalScale > 0.7) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + nodeSize + fontSize);
          }
        }}
        // 效能優化
        cooldownTicks={100}
        warmupTicks={50}
      />
    </Box>
  );
}

export default KnowledgeGraph;
