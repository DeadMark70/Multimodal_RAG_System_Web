/**
 * MetricsBadge 元件
 * 
 * 顯示學術品質評估指標
 * - 支援 1-10 分制 (新版)
 * - 向後相容舊版 faithfulness/confidence_score
 * 
 * @version 3.0.1
 */

import { 
  Badge, 
  Tooltip, 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Divider,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiShield, FiAlertTriangle, FiXCircle } from 'react-icons/fi';
import type { EvaluationMetrics } from '../../types/rag';

// ========== 型別定義 ==========

interface MetricsBadgeProps {
  /** 評估指標資料 */
  metrics: EvaluationMetrics | null | undefined;
  /** 是否顯示詳細 Tooltip (預設 true) */
  showDetailedTooltip?: boolean;
  /** 是否顯示改進建議 (預設 true) */
  showSuggestion?: boolean;
}

type ScoreLevel = 'high' | 'medium' | 'low';

interface ScoreConfig {
  colorScheme: string;
  icon: typeof FiShield;
  label: string;
  labelZh: string;
}

// ========== 常數定義 ==========

const SCORE_CONFIGS: Record<ScoreLevel, ScoreConfig> = {
  high: {
    colorScheme: 'green',
    icon: FiShield,
    label: 'High Trust',
    labelZh: '高信賴',
  },
  medium: {
    colorScheme: 'yellow',
    icon: FiAlertTriangle,
    label: 'Verify Suggested',
    labelZh: '建議查證',
  },
  low: {
    colorScheme: 'red',
    icon: FiXCircle,
    label: 'Hallucination Risk',
    labelZh: '可能幻覺',
  },
};

// ========== 輔助函數 ==========

/**
 * 檢查是否有 1-10 分制欄位
 */
function hasNewMetrics(metrics: EvaluationMetrics): boolean {
  return metrics.weighted_score !== undefined && metrics.weighted_score !== null;
}

/**
 * 根據 metrics 計算分數等級
 * - 優先使用 weighted_score (新版)
 * - 回退使用 confidence_score (舊版 + Phase 6 衝突懲罰)
 * 
 * 閾值調整 (Phase 6):
 * - > 0.9 / 9.0: 綠色 (High)
 * - 0.7-0.9 / 7.0-9.0: 黃色 (Moderate - 可能衝突)
 * - < 0.7 / 7.0: 紅色 (Low)
 */
function getScoreLevel(metrics: EvaluationMetrics): ScoreLevel {
  // 新版：使用 weighted_score (1-10)
  if (hasNewMetrics(metrics)) {
    const score = metrics.weighted_score!;
    if (score >= 9.0) return 'high';
    if (score >= 7.0) return 'medium';
    return 'low';
  }
  
  // 舊版：使用 confidence_score (0-1)
  // Phase 6 引入衝突懲罰後，confidence 可能從 1.0 降到 0.8 或更低
  const conf = metrics.confidence_score;
  if (conf > 0.9) return 'high';
  if (conf >= 0.7) return 'medium';
  return 'low';
}

/**
 * 獲取顯示分數
 */
function getDisplayScore(metrics: EvaluationMetrics): string {
  if (hasNewMetrics(metrics)) {
    return `${metrics.weighted_score!.toFixed(1)}/10`;
  }
  return `${(metrics.confidence_score * 100).toFixed(0)}%`;
}

/**
 * 格式化分數顯示
 */
function formatScore(score: number | undefined): string {
  if (score === undefined || score === null) return '-';
  return score.toFixed(1);
}

// ========== 子元件 ==========

interface DetailedTooltipContentProps {
  metrics: EvaluationMetrics;
  showSuggestion: boolean;
}

function DetailedTooltipContent({ metrics, showSuggestion }: DetailedTooltipContentProps) {
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  
  const isNew = hasNewMetrics(metrics);
  const isPassing = isNew ? metrics.is_passing : metrics.faithfulness === 'grounded';
  const passingColor = isPassing ? 'green.500' : 'red.500';
  const passingIcon = isPassing ? '✅' : '❌';

  return (
    <VStack align="stretch" spacing={2} p={1} minW="200px">
      {/* 標題 */}
      <Text fontWeight="bold" fontSize="sm" color={textColor}>
        📊 學術品質評估
      </Text>
      
      <Divider />
      
      {/* 新版：分項分數 */}
      {isNew ? (
        <VStack align="stretch" spacing={1}>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>精確度</Text>
            <Text fontSize="xs" fontWeight="medium" color={textColor}>
              {formatScore(metrics.accuracy)}/10
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>完整性</Text>
            <Text fontSize="xs" fontWeight="medium" color={textColor}>
              {formatScore(metrics.completeness)}/10
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedColor}>清晰度</Text>
            <Text fontSize="xs" fontWeight="medium" color={textColor}>
              {formatScore(metrics.clarity)}/10
            </Text>
          </HStack>
        </VStack>
      ) : (
        /* 舊版：只顯示 confidence */
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedColor}>信心分數</Text>
          <Text fontSize="xs" fontWeight="medium" color={textColor}>
            {(metrics.confidence_score * 100).toFixed(0)}%
          </Text>
        </HStack>
      )}
      
      <Divider />
      
      {/* 總評 */}
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="bold" color={textColor}>
          {isNew ? '加權總分' : '可信度'}
        </Text>
        <Text fontSize="xs" fontWeight="bold" color={passingColor}>
          {getDisplayScore(metrics)} {passingIcon} {isPassing ? '及格' : '不及格'}
        </Text>
      </HStack>
      
      {/* 改進建議 (僅新版) */}
      {showSuggestion && isNew && !metrics.is_passing && metrics.suggestion && (
        <>
          <Divider />
          <Box>
            <Text fontSize="xs" color="orange.500" fontWeight="medium">
              💡 建議：
            </Text>
            <Text fontSize="xs" color={mutedColor} mt={0.5}>
              {metrics.suggestion}
            </Text>
          </Box>
        </>
      )}

      {/* Phase 6: 衝突偵測提示 (舊版 confidence < 0.9) */}
      {!isNew && metrics.confidence_score < 0.9 && (
        <>
          <Divider />
          <Text fontSize="xs" color="orange.400">
            ⚠️ 偵測到文獻觀點衝突，建議詳閱報告對照分析
          </Text>
        </>
      )}
    </VStack>
  );
}

// ========== 主元件 ==========

export function MetricsBadge({ 
  metrics, 
  showDetailedTooltip = true,
  showSuggestion = true,
}: MetricsBadgeProps) {
  // 空值處理
  if (!metrics) return null;

  // 判斷分數等級
  const level = getScoreLevel(metrics);
  const config = SCORE_CONFIGS[level];
  const displayScore = getDisplayScore(metrics);

  // Tooltip 內容
  const tooltipContent = showDetailedTooltip ? (
    <DetailedTooltipContent metrics={metrics} showSuggestion={showSuggestion} />
  ) : (
    `信心分數: ${displayScore}`
  );

  return (
    <Tooltip 
      label={tooltipContent}
      hasArrow
      placement="top"
      bg={useColorModeValue('white', 'gray.800')}
      color={useColorModeValue('gray.700', 'white')}
      borderRadius="md"
      boxShadow="lg"
      p={showDetailedTooltip ? 2 : 1}
    >
      <Badge 
        colorScheme={config.colorScheme} 
        variant="solid" 
        borderRadius="full" 
        px={3}
        py={1}
        display="flex"
        alignItems="center"
        gap={1.5}
        cursor="help"
        fontSize="xs"
        fontWeight="semibold"
      >
        <Icon as={config.icon} boxSize={3} />
        <Text as="span">
          {displayScore}
        </Text>
        <Text as="span" opacity={0.9}>
          ({config.labelZh})
        </Text>
      </Badge>
    </Tooltip>
  );
}

// ========== 匯出 ==========

export type { MetricsBadgeProps };
export default MetricsBadge;
