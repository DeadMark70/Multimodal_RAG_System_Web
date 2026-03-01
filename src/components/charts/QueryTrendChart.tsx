/**
 * QueryTrendChart 元件
 * 
 * 顯示近 7 天查詢趨勢折線圖
 */

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

interface QueryTrendChartProps {
  data: number[]; // 7 天的查詢數
}

const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export default function QueryTrendChart({ data }: QueryTrendChartProps) {
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');
  const tooltipBg = useColorModeValue('#fff', '#1A202C');
  const tooltipBorder = useColorModeValue('#E2E8F0', '#2D3748');
  const lineColor = '#1337EC'; // brand.500
  
  // 計算當天是星期幾，然後對應到正確的標籤
  const today = new Date().getDay(); // 0 = 週日, 1 = 週一, ...
  const chartData = data.map((value, index) => {
    // 從 7 天前開始計算
    const dayIndex = (today - 6 + index + 7) % 7;
    return {
      name: DAY_LABELS[dayIndex === 0 ? 6 : dayIndex - 1], // 調整為週一開始
      queries: value,
    };
  });

  const hasData = data.some(v => v > 0);

  if (!hasData) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">尚無查詢資料</Text>
      </Box>
    );
  }

  return (
    <Box h="200px" w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value) => [`${String(value ?? 0)} 次`, '查詢數']}
            contentStyle={{ 
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: '8px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="queries" 
            stroke={lineColor} 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorQueries)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
