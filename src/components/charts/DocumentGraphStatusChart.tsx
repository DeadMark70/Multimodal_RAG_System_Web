import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface DocumentGraphStatusDatum {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DocumentGraphStatusChartProps {
  data: DocumentGraphStatusDatum[];
}

export default function DocumentGraphStatusChart({
  data,
}: DocumentGraphStatusChartProps) {
  const textColor = useColorModeValue('gray.700', 'white');
  const tooltipBg = useColorModeValue('#fff', '#1A202C');
  const tooltipBorder = useColorModeValue('#E2E8F0', '#2D3748');

  const visibleData = data.filter((item) => item.value > 0);
  const total = visibleData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">尚無文件或圖譜狀態資料</Text>
      </Box>
    );
  }

  const renderCustomLabel = (props: { name?: string; percent?: number }) => {
    const { name, percent } = props;
    if (!name || percent === undefined || percent < 0.06) {
      return '';
    }
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Box h="250px" w="100%">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visibleData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
          >
            {visibleData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${String(value ?? 0)} 份`, '文件數']}
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <Text as="span" color={textColor} fontSize="sm">
                {value}
              </Text>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
