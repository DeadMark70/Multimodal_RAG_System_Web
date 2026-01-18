/**
 * EvaluationRadarChart 元件
 * 
 * 顯示學術評估指標的雷達圖 (1-10 分制)
 * - Accuracy (精確度)
 * - Completeness (完整性)
 * - Clarity (清晰度)
 * 
 * @version 3.0.0
 */

import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import type { EvaluationMetrics } from '../../types/rag';

// ========== 型別定義 ==========

type ChartSize = 'sm' | 'md' | 'lg';

interface EvaluationRadarChartProps {
  /** 評估指標資料 */
  metrics: EvaluationMetrics | null | undefined;
  /** 圖表尺寸 (預設 'md') */
  size?: ChartSize;
  /** 是否顯示分數標籤 (預設 true) */
  showLabels?: boolean;
}

interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark: number;
}

// ========== 常數定義 ==========

/** 學術風低飽和度配色 */
const ACADEMIC_COLORS = {
  light: {
    fill: 'rgba(67, 97, 238, 0.25)',
    stroke: 'rgba(67, 97, 238, 0.85)',
    grid: 'rgba(160, 174, 192, 0.3)',
    angleAxis: '#4A5568',
    radiusAxis: '#718096',
  },
  dark: {
    fill: 'rgba(99, 129, 255, 0.3)',
    stroke: 'rgba(129, 155, 255, 0.9)',
    grid: 'rgba(160, 174, 192, 0.2)',
    angleAxis: '#A0AEC0',
    radiusAxis: '#718096',
  },
};

/** 尺寸配置 */
const SIZE_CONFIG: Record<ChartSize, { width: number; height: number; outerRadius: number }> = {
  sm: { width: 180, height: 150, outerRadius: 50 },
  md: { width: 250, height: 200, outerRadius: 70 },
  lg: { width: 320, height: 260, outerRadius: 95 },
};

// ========== 輔助函數 ==========

/**
 * 檢查是否有 1-10 分制欄位
 */
function hasRadarData(metrics: EvaluationMetrics): boolean {
  return (
    metrics.accuracy !== undefined &&
    metrics.completeness !== undefined &&
    metrics.clarity !== undefined
  );
}

/**
 * 將評估指標轉換為雷達圖資料格式
 */
function metricsToRadarData(metrics: EvaluationMetrics): RadarDataPoint[] {
  return [
    { subject: '精確度', value: metrics.accuracy ?? 0, fullMark: 10 },
    { subject: '完整性', value: metrics.completeness ?? 0, fullMark: 10 },
    { subject: '清晰度', value: metrics.clarity ?? 0, fullMark: 10 },
  ];
}

// ========== 元件 ==========

// ========== 子元件 ==========

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarDataPoint }> }) => {
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const tooltipBg = useColorModeValue('#FFFFFF', '#1A202C');
  const tooltipBorder = useColorModeValue('#E2E8F0', '#2D3748');

  if (active && payload && payload.length > 0) {
    const { subject, value } = payload[0].payload;
    return (
      <Box
        bg={tooltipBg}
        border="1px solid"
        borderColor={tooltipBorder}
        borderRadius="md"
        px={3}
        py={2}
        boxShadow="md"
      >
        <Text fontSize="sm" fontWeight="medium" color={textColor}>
          {subject}: {value.toFixed(1)}/10
        </Text>
      </Box>
    );
  }
  return null;
};

// ========== 元件 ==========

export default function EvaluationRadarChart({ 
  metrics, 
  size = 'md',
  showLabels = true,
}: EvaluationRadarChartProps) {
  // 主題顏色
  const colorMode = useColorModeValue('light', 'dark');
  const colors = ACADEMIC_COLORS[colorMode];

  // 尺寸配置
  const sizeConfig = SIZE_CONFIG[size];

  // 空值處理 - 包含檢查是否有 1-10 分制欄位
  if (!metrics || !hasRadarData(metrics)) {
    return (
      <Box 
        w={sizeConfig.width} 
        h={sizeConfig.height} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Text color="gray.500" fontSize="sm">
          無評估資料
        </Text>
      </Box>
    );
  }

  const data = metricsToRadarData(metrics);

  return (
    <Box w={sizeConfig.width} h={sizeConfig.height}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius={sizeConfig.outerRadius}>
          {/* 網格線 */}
          <PolarGrid 
            stroke={colors.grid}
            strokeDasharray="3 3"
          />
          
          {/* 角度軸 (指標名稱) */}
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: colors.angleAxis, 
              fontSize: size === 'sm' ? 10 : 12,
            }}
          />
          
          {/* 半徑軸 (分數刻度) */}
          <PolarRadiusAxis 
            angle={90}
            domain={[0, 10]}
            tickCount={6}
            tick={showLabels ? { 
              fill: colors.radiusAxis, 
              fontSize: size === 'sm' ? 8 : 10,
            } : false}
            axisLine={false}
          />
          
          {/* 雷達區域 */}
          <Radar
            name="評估分數"
            dataKey="value"
            stroke={colors.stroke}
            fill={colors.fill}
            strokeWidth={2}
            dot={{ 
              r: size === 'sm' ? 3 : 4, 
              fill: colors.stroke,
            }}
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ========== 匯出 ==========

export type { EvaluationRadarChartProps, ChartSize };
