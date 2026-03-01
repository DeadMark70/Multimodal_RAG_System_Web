/**
 * AccuracyPieChart 元件
 * 
 * 顯示有據/幻覺/不確定的比例圓餅圖
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

interface AccuracyPieChartProps {
  grounded: number;
  hallucinated: number;
  uncertain: number;
}

const COLORS = {
  grounded: '#48BB78',    // green.400
  hallucinated: '#F56565', // red.400
  uncertain: '#A0AEC0',    // gray.400
};

export default function AccuracyPieChart({ grounded, hallucinated, uncertain }: AccuracyPieChartProps) {
  const textColor = useColorModeValue('gray.700', 'white');
  const tooltipBg = useColorModeValue('#fff', '#1A202C');
  const tooltipBorder = useColorModeValue('#E2E8F0', '#2D3748');
  
  const data = [
    { name: '有據', value: grounded, color: COLORS.grounded },
    { name: '幻覺', value: hallucinated, color: COLORS.hallucinated },
    { name: '不確定', value: uncertain, color: COLORS.uncertain },
  ].filter(item => item.value > 0);

  const total = grounded + hallucinated + uncertain;

  if (total === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">尚無評估資料</Text>
      </Box>
    );
  }

  // 自定義標籤函數
  const renderCustomLabel = (props: { name?: string; percent?: number }) => {
    const { name, percent } = props;
    if (!name || percent === undefined) return '';
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Box h="250px" w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${String(value ?? 0)} 次`, '查詢數']}
            contentStyle={{ 
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: '8px'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string) => <Text as="span" color={textColor} fontSize="sm">{value}</Text>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
