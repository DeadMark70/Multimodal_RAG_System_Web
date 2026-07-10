import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from '../../stores/useSettingsStore';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      ...useSettingsStore.getState(),
      ragSettings: {
        enable_hyde: false,
        enable_multi_query: true,
        enable_reranking: true,
        enable_evaluation: false,
        enable_graph_rag: false,
        graph_search_mode: 'generic',
        enable_graph_planning: false,
        enable_deep_image_analysis: false,
        max_subtasks: 5,
      },
      selectedChatModeId: 'advanced',
    });
  });

  it('describes Graph RAG as an explicit optional retrieval aid', () => {
    render(
      <ChakraProvider>
        <SettingsPanel />
      </ChakraProvider>
    );

    expect(screen.getByText('Graph RAG')).toBeInTheDocument();
    expect(
      screen.getByText('選用於跨文件關係與主張範圍問題的輔助檢索。')
    ).toBeInTheDocument();
    expect(screen.queryByText('預設啟用，可搭配 Generic Mode 自動路由')).not.toBeInTheDocument();
  });
});
