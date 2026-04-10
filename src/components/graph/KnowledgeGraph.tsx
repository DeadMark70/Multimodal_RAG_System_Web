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

import {
  Suspense,
  lazy,
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  Box,
  useColorModeValue,
  Text,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiPlus, FiMinus, FiCpu, FiBox } from "react-icons/fi";
import type { GraphData, GraphNode, GraphLink } from "../../types/graph";
import { useSessionActions } from "../../stores";
import GlassPane from "../common/GlassPane";

// ========== Mock Data ==========

const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    {
      id: "Machine Learning",
      group: 1,
      val: 12,
      desc: "機器學習是 AI 的核心分支",
      type: "Concept",
    },
    {
      id: "Deep Learning",
      group: 1,
      val: 10,
      desc: "使用神經網路的機器學習方法",
      type: "Concept",
    },
    {
      id: "Neural Networks",
      group: 1,
      val: 8,
      desc: "模仿生物神經元的計算模型",
      type: "Concept",
    },
    {
      id: "Transformer",
      group: 1,
      val: 9,
      desc: "注意力機制為核心的架構",
      type: "Model",
    },
    {
      id: "BERT",
      group: 1,
      val: 7,
      desc: "Bidirectional Encoder Representations",
      type: "Model",
    },
    {
      id: "GPT",
      group: 1,
      val: 8,
      desc: "Generative Pre-trained Transformer",
      type: "Model",
    },
    {
      id: "Natural Language Processing",
      group: 2,
      val: 10,
      desc: "自然語言處理技術",
      type: "Concept",
    },
    {
      id: "Text Embedding",
      group: 2,
      val: 6,
      desc: "將文字轉換為向量表示",
      type: "Technique",
    },
    {
      id: "Semantic Search",
      group: 2,
      val: 7,
      desc: "基於語義的搜尋技術",
      type: "Technique",
    },
    {
      id: "Tokenization",
      group: 2,
      val: 5,
      desc: "文字分詞處理",
      type: "Technique",
    },
    {
      id: "RAG",
      group: 3,
      val: 11,
      desc: "Retrieval-Augmented Generation",
      type: "Framework",
    },
    {
      id: "Vector Database",
      group: 3,
      val: 8,
      desc: "向量資料庫如 FAISS, Pinecone",
      type: "Technology",
    },
    {
      id: "Knowledge Graph",
      group: 3,
      val: 9,
      desc: "知識圖譜結構化知識",
      type: "Technology",
    },
    {
      id: "GraphRAG",
      group: 3,
      val: 8,
      desc: "結合圖譜的 RAG 方法",
      type: "Framework",
    },
    {
      id: "Chunking",
      group: 3,
      val: 5,
      desc: "文件分塊策略",
      type: "Technique",
    },
    {
      id: "OpenAI",
      group: 4,
      val: 9,
      desc: "AI 研究公司",
      type: "Organization",
    },
    { id: "Google", group: 4, val: 9, desc: "科技公司", type: "Organization" },
    {
      id: "Microsoft",
      group: 4,
      val: 8,
      desc: "科技公司",
      type: "Organization",
    },
  ],
  links: [
    { source: "Machine Learning", target: "Deep Learning", label: "includes" },
    { source: "Deep Learning", target: "Neural Networks", label: "uses" },
    { source: "Neural Networks", target: "Transformer", label: "evolved_to" },
    { source: "Transformer", target: "BERT", label: "inspired" },
    { source: "Transformer", target: "GPT", label: "inspired" },
    {
      source: "Natural Language Processing",
      target: "Text Embedding",
      label: "uses",
    },
    {
      source: "Natural Language Processing",
      target: "Tokenization",
      label: "requires",
    },
    { source: "Text Embedding", target: "Semantic Search", label: "enables" },
    { source: "RAG", target: "Vector Database", label: "uses" },
    { source: "RAG", target: "Knowledge Graph", label: "can_use" },
    { source: "Knowledge Graph", target: "GraphRAG", label: "enables" },
    { source: "RAG", target: "Chunking", label: "requires" },
    {
      source: "Deep Learning",
      target: "Natural Language Processing",
      label: "applied_to",
    },
    { source: "BERT", target: "Text Embedding", label: "generates" },
    { source: "GPT", target: "RAG", label: "powers" },
    { source: "Semantic Search", target: "RAG", label: "component_of" },
    { source: "OpenAI", target: "GPT", label: "created" },
    { source: "Google", target: "BERT", label: "created" },
    { source: "Google", target: "Transformer", label: "invented" },
    { source: "Microsoft", target: "OpenAI", label: "invested_in" },
  ],
};

const COMMUNITY_COLORS = [
  "#7C3AED",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#8B5CF6",
];

const LARGE_GRAPH_NODE_THRESHOLD = 1500;
const LOW_DETAIL_SCALE_THRESHOLD = 0.9;
const LABEL_SCALE_THRESHOLD = 2;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const ForceGraph3D = lazy(() => import("react-force-graph-3d"));

export interface KnowledgeGraphProps {
  data?: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  isLoading?: boolean;
  width?: number;
  height?: number;
}

type ForceNode = Omit<GraphNode, "fx" | "fy"> & {
  fx?: number;
  fy?: number;
};

type ForceLink = Omit<GraphLink, "source" | "target"> & {
  source: string | number | ForceNode;
  target: string | number | ForceNode;
};

type ForceNode3D = {
  id: string | number;
  group?: number;
  val?: number;
  desc?: string;
  type?: string;
  source_docs?: string[];
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
};

type ForceLink3D = {
  source: string | number | ForceNode3D;
  target: string | number | ForceNode3D;
  label?: string;
  weight?: number;
};

type GraphRenderableNode = {
  [key: string]: unknown;
  id?: string | number;
  desc?: string;
  group?: number;
  val?: number;
};

type GraphRenderableLink = {
  [key: string]: unknown;
  label?: string;
};

interface GraphLoadingOverlayProps {
  message: string;
  zIndex: number;
}

function GraphLoadingOverlay({ message, zIndex }: GraphLoadingOverlayProps) {
  return (
    <Box
      position="absolute"
      inset="0"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="blackAlpha.300"
      backdropFilter="blur(5px)"
      zIndex={zIndex}
    >
      <VStack spacing={4}>
        <Box
          as={FiCpu}
          size="40px"
          color="brand.500"
          animation={`${pulse} 2s infinite`}
        />
        <Text
          fontWeight="bold"
          color="white"
          textShadow="0 0 10px rgba(0,0,0,0.5)"
        >
          {message}
        </Text>
      </VStack>
    </Box>
  );
}

export function KnowledgeGraph({
  data,
  onNodeClick,
  isLoading = false,
  width: propWidth,
  height: propHeight = 600,
}: KnowledgeGraphProps) {
  const graphRef = useRef<
    ForceGraphMethods<ForceNode, ForceLink> | undefined
  >();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [is3D, setIs3D] = useState(false);
  const actions = useSessionActions();

  // Theme colors
  const bgColor = useColorModeValue("#ffffff", "#1a202c");
  const textColor = useColorModeValue("#2d3748", "#e2e8f0");
  const linkColor = useColorModeValue("#2C5282", "#63B3ED");

  const graphData = useMemo(() => data ?? MOCK_GRAPH_DATA, [data]);
  const isLargeGraph = graphData.nodes.length >= LARGE_GRAPH_NODE_THRESHOLD;
  const forceGraphData2D = useMemo(
    () => ({
      nodes: graphData.nodes.map((node) => ({
        ...node,
        fx: node.fx ?? undefined,
        fy: node.fy ?? undefined,
      })),
      links: graphData.links.map((link) => ({
        ...link,
      })),
    }),
    [graphData],
  );
  const forceGraphData3D = useMemo(
    () => ({
      nodes: graphData.nodes.map(
        (node): ForceNode3D => ({
          id: node.id,
          group: node.group,
          val: node.val,
          desc: node.desc,
          type: node.type,
          source_docs: node.source_docs,
          x: node.x,
          y: node.y,
          vx: node.vx,
          vy: node.vy,
        }),
      ),
      links: graphData.links.map(
        (link): ForceLink3D => ({
          source: link.source,
          target: link.target,
          label: link.label,
          weight: link.weight,
        }),
      ),
    }),
    [graphData],
  );
  const renderConfig = useMemo(
    () => ({
      cooldownTicks: isLargeGraph ? 35 : 100,
      warmupTicks: isLargeGraph ? 15 : 50,
      linkWidth: isLargeGraph ? 1 : 1.5,
      arrowLength: isLargeGraph ? 0 : 4,
      nodeRelSize: isLargeGraph ? 5 : 6,
    }),
    [isLargeGraph],
  );

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

  const getNodeColor = useCallback((node: GraphRenderableNode) => {
    const groupIndex = (node.group ?? 0) % COMMUNITY_COLORS.length;
    return COMMUNITY_COLORS[groupIndex];
  }, []);

  const getNodeLabel = useCallback(
    (node: GraphRenderableNode) =>
      `${node.id != null ? String(node.id) : ""}\n${node.desc ?? ""}`,
    [],
  );

  const getLinkLabel = useCallback(
    (link: GraphRenderableLink) => link.label ?? "",
    [],
  );

  const selectNode = useCallback(
    (node: { id: string | number }) => {
      actions.setSelectedNodeId(String(node.id));
    },
    [actions],
  );

  const handle2DNodeClick = useCallback(
    (node: ForceNode) => {
      selectNode(node);
      if (
        graphRef.current &&
        typeof node.x === "number" &&
        typeof node.y === "number"
      ) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }
      onNodeClick?.(node as GraphNode);
    },
    [onNodeClick, selectNode],
  );

  const handle3DNodeClick = useCallback(
    (node: ForceNode3D) => {
      selectNode(node);
      onNodeClick?.(node as GraphNode);
    },
    [onNodeClick, selectNode],
  );

  const handleZoomIn = () => {
    graphRef.current?.zoom((graphRef.current.zoom() || 1) * 1.2, 400);
  };

  const handleZoomOut = () => {
    graphRef.current?.zoom((graphRef.current.zoom() || 1) / 1.2, 400);
  };

  const graphWidth = dimensions.width || propWidth || 800;
  const graphHeight = dimensions.height || propHeight || 600;
  const canRenderGraph =
    !isLoading && (dimensions.width > 0 || Boolean(propWidth));

  return (
    <Box
      ref={containerRef}
      w="full"
      h={propHeight ? `${propHeight}px` : "full"}
      minH="400px"
      position="relative"
      overflow="hidden"
      borderRadius="xl"
      bg={bgColor}
    >
      {canRenderGraph && !is3D && (
        <ForceGraph2D
          ref={graphRef}
          graphData={forceGraphData2D}
          width={graphWidth}
          height={graphHeight}
          backgroundColor={bgColor}
          nodeLabel={getNodeLabel}
          nodeColor={getNodeColor}
          nodeRelSize={renderConfig.nodeRelSize}
          nodeVal={(node: ForceNode) => node.val ?? 5}
          linkColor={() => linkColor}
          linkWidth={renderConfig.linkWidth}
          linkDirectionalArrowLength={renderConfig.arrowLength}
          linkDirectionalArrowRelPos={0.9}
          linkLabel={getLinkLabel}
          onNodeClick={(node) => handle2DNodeClick(node as ForceNode)}
          onNodeDragEnd={(node: ForceNode) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          nodeCanvasObject={(
            node: ForceNode,
            ctx: CanvasRenderingContext2D,
            globalScale: number,
          ) => {
            const label = node.id ?? "";
            const displayLabel =
              isLargeGraph && label.length > 24
                ? `${label.slice(0, 21)}...`
                : label;
            const fontSize = Math.max(3.5, 12 / globalScale);
            const nodeSize = Math.sqrt(node.val ?? 5) * (isLargeGraph ? 3 : 4);
            const x = node.x ?? 0;
            const y = node.y ?? 0;

            if (globalScale < LOW_DETAIL_SCALE_THRESHOLD) {
              const simplifiedNodeSize = Math.max(
                isLargeGraph ? 1.2 : 1.8,
                Math.min(nodeSize * 0.45, isLargeGraph ? 2.4 : 3),
              );
              ctx.beginPath();
              ctx.arc(x, y, simplifiedNodeSize, 0, 2 * Math.PI);
              ctx.fillStyle = getNodeColor(node);
              ctx.fill();
              return;
            }

            ctx.beginPath();
            ctx.arc(x, y, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = getNodeColor(node);
            ctx.fill();

            if (globalScale >= LABEL_SCALE_THRESHOLD) {
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = textColor;
              ctx.fillText(displayLabel, x, y + nodeSize + fontSize);
            }
          }}
          cooldownTicks={renderConfig.cooldownTicks}
          warmupTicks={renderConfig.warmupTicks}
        />
      )}

      {canRenderGraph && is3D && (
        <Suspense
          fallback={
            <GraphLoadingOverlay message="Loading 3D Graph..." zIndex={15} />
          }
        >
          <ForceGraph3D
            graphData={forceGraphData3D}
            width={graphWidth}
            height={graphHeight}
            backgroundColor={bgColor}
            nodeLabel={getNodeLabel}
            nodeColor={getNodeColor}
            nodeVal={(node: GraphRenderableNode) => node.val ?? 5}
            linkColor={() => linkColor}
            linkWidth={renderConfig.linkWidth}
            linkDirectionalArrowLength={renderConfig.arrowLength}
            linkDirectionalArrowRelPos={0.9}
            linkLabel={getLinkLabel}
            onNodeClick={(node) => handle3DNodeClick(node as ForceNode3D)}
          />
        </Suspense>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <GraphLoadingOverlay message="Building Graph..." zIndex={20} />
      )}

      {/* Glass Controls */}
      <GlassPane
        position="absolute"
        bottom="4"
        right="4"
        p="2"
        borderRadius="lg"
        zIndex="10"
      >
        <VStack spacing="2">
          <IconButton
            aria-label={is3D ? "Switch to 2D graph" : "Switch to 3D graph"}
            aria-pressed={is3D}
            icon={<FiBox />}
            onClick={() => setIs3D((value) => !value)}
            size="sm"
            variant="ghost"
            bg={is3D ? "whiteAlpha.200" : undefined}
            _hover={{ bg: is3D ? "whiteAlpha.300" : "whiteAlpha.100" }}
          />
          {!is3D && (
            <>
              <IconButton
                aria-label="Zoom In"
                icon={<FiPlus />}
                onClick={handleZoomIn}
                size="sm"
                variant="ghost"
              />
              <IconButton
                aria-label="Zoom Out"
                icon={<FiMinus />}
                onClick={handleZoomOut}
                size="sm"
                variant="ghost"
              />
            </>
          )}
        </VStack>
      </GlassPane>
    </Box>
  );
}

export default KnowledgeGraph;
