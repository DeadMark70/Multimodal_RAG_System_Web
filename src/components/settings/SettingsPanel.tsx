/**
 * SettingsPanel - RAG 設定面板
 *
 * 提供所有 RAG 策略與 GraphRAG 參數的 UI 控制
 *
 * @remarks
 * - 綁定 useSettingsStore (Zustand)
 * - 遵循 Theme First 原則，使用 Chakra UI tokens
 * - 支援 Dark Mode
 */

import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Icon,
  Tooltip,
  Badge,
  useColorModeValue,
  Collapse,
  IconButton,
  Heading,
} from '@chakra-ui/react';
import {
  FiZap,
  FiLayers,
  FiFilter,
  FiCheckCircle,
  FiShare2,
  FiGitBranch,
  FiSearch,
  FiInfo,
  FiSettings,
  FiChevronDown,
  FiChevronUp,
  FiEye,
} from 'react-icons/fi';
import { useState } from 'react';
import { useSettingsStore, useSettingsActions } from '../../stores';
import type { RagSettings } from '../../stores';

// ========== 子元件: 設定項目 ==========

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  isEnabled: boolean;
  onChange: (value: boolean) => void;
  isNew?: boolean;
  /** 是否禁用開關 (後端強制設定) */
  isDisabled?: boolean;
  /** 顯示「預設」標籤 */
  isDefault?: boolean;
}

const SettingItem = ({
  icon,
  label,
  description,
  isEnabled,
  onChange,
  isNew,
  isDisabled,
  isDefault,
}: SettingItemProps) => {
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const descColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <HStack justify="space-between" w="full" py={2} opacity={isDisabled ? 0.7 : 1}>
      <HStack spacing={3} flex={1}>
        <Icon as={icon} color={isEnabled ? 'brand.500' : 'gray.400'} />
        <Box>
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="500" color={textColor}>
              {label}
            </Text>
            {isNew && (
              <Badge colorScheme="purple" fontSize="xs" variant="subtle">
                NEW
              </Badge>
            )}
            {isDefault && (
              <Badge colorScheme="green" fontSize="xs" variant="subtle">
                預設
              </Badge>
            )}
          </HStack>
          {description && (
            <Text fontSize="xs" color={descColor}>
              {description}
            </Text>
          )}
        </Box>
      </HStack>
      <Switch
        colorScheme="brand"
        isChecked={isEnabled}
        onChange={(e) => onChange(e.target.checked)}
        size="md"
        isDisabled={isDisabled}
      />
    </HStack>
  );
};

// ========== 主元件 ==========

export interface SettingsPanelProps {
  /** 是否為抽屜模式 (Drawer) */
  isDrawerMode?: boolean;
  /** 收合時的回調 */
  onClose?: () => void;
}

export function SettingsPanel({ isDrawerMode = false }: SettingsPanelProps) {
  const { ragSettings } = useSettingsStore();
  const actions = useSettingsActions();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.900');

  // Helper to update setting
  const updateSetting = <K extends keyof RagSettings>(
    key: K,
    value: RagSettings[K]
  ) => {
    actions.setRagSetting(key, value);
  };

  return (
    <Box
      bg={bg}
      borderRadius={isDrawerMode ? 'none' : 'xl'}
      border={isDrawerMode ? 'none' : '1px'}
      borderColor={borderColor}
      p={4}
      w="full"
      maxW={isDrawerMode ? 'full' : '320px'}
    >
      {/* 標題 */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Icon as={FiSettings} color="brand.500" />
          <Heading size="sm">RAG 設定</Heading>
        </HStack>
        <Tooltip label="設定會自動儲存" fontSize="xs">
          <span>
            <Icon as={FiInfo} color="gray.400" cursor="help" />
          </span>
        </Tooltip>
      </HStack>

      <VStack spacing={4} align="stretch">
        {/* ========== 基礎檢索策略 ========== */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color="gray.500" mb={2} textTransform="uppercase">
            檢索策略
          </Text>
          <VStack
            spacing={1}
            align="stretch"
            bg={sectionBg}
            p={3}
            borderRadius="lg"
          >
            <SettingItem
              icon={FiZap}
              label="HyDE 增強"
              description="假設性文件嵌入"
              isEnabled={ragSettings.enable_hyde}
              onChange={(v) => updateSetting('enable_hyde', v)}
            />
            <SettingItem
              icon={FiLayers}
              label="多重查詢"
              description="多角度查詢融合"
              isEnabled={ragSettings.enable_multi_query}
              onChange={(v) => updateSetting('enable_multi_query', v)}
            />
            <SettingItem
              icon={FiFilter}
              label="重排序"
              description="Cross-Encoder 精準排序"
              isEnabled={ragSettings.enable_reranking}
              onChange={(v) => updateSetting('enable_reranking', v)}
            />
            <SettingItem
              icon={FiCheckCircle}
              label="評估模式"
              description="啟用責任 AI 指標"
              isEnabled={ragSettings.enable_evaluation}
              onChange={(v) => updateSetting('enable_evaluation', v)}
            />
          </VStack>
        </Box>

        <Divider />

        {/* ========== GraphRAG 設定 ========== */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color="gray.500" mb={2} textTransform="uppercase">
            知識圖譜 (GraphRAG)
          </Text>
          <VStack
            spacing={1}
            align="stretch"
            bg={sectionBg}
            p={3}
            borderRadius="lg"
          >
            <SettingItem
              icon={FiShare2}
              label="Graph RAG"
              description="預設啟用，可搭配 Generic Mode 自動路由"
              isEnabled={ragSettings.enable_graph_rag}
              onChange={(v) => updateSetting('enable_graph_rag', v)}
              isDefault
            />

            <Collapse in={ragSettings.enable_graph_rag} animateOpacity>
              <Box py={2} pl={7}>
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FiSearch} color="gray.400" fontSize="sm" />
                    <Text fontSize="sm" fontWeight="500">
                      搜尋模式
                    </Text>
                  </HStack>
                </HStack>
                <Select
                  size="sm"
                  value={ragSettings.graph_search_mode}
                  onChange={(e) =>
                    updateSetting(
                      'graph_search_mode',
                      e.target.value as RagSettings['graph_search_mode']
                    )
                  }
                  bg={bg}
                >
                  <option value="generic">🧠 Generic (推薦)</option>
                  <option value="auto">🤖 Auto (相容)</option>
                  <option value="local">📍 區域搜尋</option>
                  <option value="global">🌐 全域搜尋</option>
                  <option value="hybrid">🔀 混合搜尋</option>
                </Select>
                <Text mt={2} fontSize="xs" color="gray.500">
                  Generic Mode 會依問題類型在 local/global 間自動路由並控制圖譜上下文密度。
                </Text>
              </Box>
            </Collapse>

            <SettingItem
              icon={FiGitBranch}
              label="圖譜規劃"
              description="Deep Research 模式"
              isEnabled={ragSettings.enable_graph_planning}
              onChange={(v) => updateSetting('enable_graph_planning', v)}
              isNew
            />
            
            <SettingItem
              icon={FiEye}
              label="深度視覺查證"
              description="圖片細節二次分析"
              isEnabled={ragSettings.enable_deep_image_analysis}
              onChange={(v) => updateSetting('enable_deep_image_analysis', v)}
              isNew
            />
          </VStack>
        </Box>

        {/* ========== 進階設定 (可收合) ========== */}
        <Box>
          <HStack
            justify="space-between"
            cursor="pointer"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            py={1}
          >
            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase">
              進階設定
            </Text>
            <IconButton
              aria-label="Toggle advanced"
              icon={isAdvancedOpen ? <FiChevronUp /> : <FiChevronDown />}
              size="xs"
              variant="ghost"
            />
          </HStack>

          <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack
              spacing={3}
              align="stretch"
              bg={sectionBg}
              p={3}
              borderRadius="lg"
              mt={2}
            >
              {/* 子任務數量 */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="500">
                    研究子任務數
                  </Text>
                  <Badge colorScheme="brand">{ragSettings.max_subtasks}</Badge>
                </HStack>
                <Slider
                  value={ragSettings.max_subtasks}
                  min={1}
                  max={10}
                  step={1}
                  onChange={(v) => updateSetting('max_subtasks', v)}
                  colorScheme="brand"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.400">1</Text>
                  <Text fontSize="xs" color="gray.400">10</Text>
                </HStack>
              </Box>
            </VStack>
          </Collapse>
        </Box>

        {/* ========== 快速重置 ========== */}
        <Text
          fontSize="xs"
          color="brand.500"
          cursor="pointer"
          textAlign="center"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => actions.resetRagSettings()}
        >
          重置為預設值
        </Text>
      </VStack>
    </Box>
  );
}

export default SettingsPanel;
