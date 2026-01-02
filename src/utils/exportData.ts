/**
 * exportData 工具
 * 
 * 將實驗結果匯出為 CSV 或 JSON 格式
 */

import type { ExperimentResult } from '../types/rag';

/**
 * 將資料匯出為 CSV 格式
 */
export function exportToCsv(data: ExperimentResult[], filename: string = 'experiment_results'): void {
  if (data.length === 0) {
    console.warn('沒有資料可匯出');
    return;
  }

  // CSV 標頭
  const headers = [
    'ID',
    '問題',
    'RAG 回答',
    'RAG 忠實度',
    'RAG 信心分數',
    'Vanilla 回答',
    'Vanilla 忠實度',
    'Vanilla 信心分數',
    '選擇文件',
    '時間戳記',
  ];

  // 轉換資料為 CSV 行
  const rows = data.map(result => [
    result.id,
    escapeCSV(result.question),
    escapeCSV(result.rag_answer),
    result.rag_faithfulness || '-',
    result.rag_confidence?.toFixed(2) || '-',
    escapeCSV(result.vanilla_answer),
    result.vanilla_faithfulness || '-',
    result.vanilla_confidence?.toFixed(2) || '-',
    result.selected_docs.join('; '),
    new Date(result.timestamp).toISOString(),
  ]);

  // 組合 CSV 內容
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // 下載檔案
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * 將資料匯出為 JSON 格式
 */
export function exportToJson(data: ExperimentResult[], filename: string = 'experiment_results'): void {
  if (data.length === 0) {
    console.warn('沒有資料可匯出');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

/**
 * 產生匯出摘要報告
 */
export function generateSummaryReport(data: ExperimentResult[]): string {
  if (data.length === 0) {
    return '# 實驗摘要報告\n\n沒有實驗資料。';
  }

  const totalExperiments = data.length;
  
  // RAG 統計
  const ragGrounded = data.filter(d => d.rag_faithfulness === 'grounded').length;
  const ragHallucinated = data.filter(d => d.rag_faithfulness === 'hallucinated').length;
  const ragUncertain = data.filter(d => d.rag_faithfulness === 'uncertain').length;
  const ragAvgConfidence = data.reduce((sum, d) => sum + (d.rag_confidence || 0), 0) / totalExperiments;

  // Vanilla 統計
  const vanillaGrounded = data.filter(d => d.vanilla_faithfulness === 'grounded').length;
  const vanillaHallucinated = data.filter(d => d.vanilla_faithfulness === 'hallucinated').length;
  const vanillaUncertain = data.filter(d => d.vanilla_faithfulness === 'uncertain').length;
  const vanillaAvgConfidence = data.reduce((sum, d) => sum + (d.vanilla_confidence || 0), 0) / totalExperiments;

  return `# 實驗摘要報告

生成時間: ${new Date().toLocaleString('zh-TW')}
總實驗數: ${totalExperiments}

## RAG 模式結果
- 有據回答: ${ragGrounded} (${((ragGrounded / totalExperiments) * 100).toFixed(1)}%)
- 幻覺回答: ${ragHallucinated} (${((ragHallucinated / totalExperiments) * 100).toFixed(1)}%)
- 不確定: ${ragUncertain} (${((ragUncertain / totalExperiments) * 100).toFixed(1)}%)
- 平均信心分數: ${(ragAvgConfidence * 100).toFixed(1)}%

## Vanilla LLM 結果
- 有據回答: ${vanillaGrounded} (${((vanillaGrounded / totalExperiments) * 100).toFixed(1)}%)
- 幻覺回答: ${vanillaHallucinated} (${((vanillaHallucinated / totalExperiments) * 100).toFixed(1)}%)
- 不確定: ${vanillaUncertain} (${((vanillaUncertain / totalExperiments) * 100).toFixed(1)}%)
- 平均信心分數: ${(vanillaAvgConfidence * 100).toFixed(1)}%

## 結論
RAG 模式的準確率 ${ragGrounded > vanillaGrounded ? '高於' : ragGrounded < vanillaGrounded ? '低於' : '等於'} Vanilla LLM。
RAG 模式的幻覺率 ${ragHallucinated < vanillaHallucinated ? '低於' : ragHallucinated > vanillaHallucinated ? '高於' : '等於'} Vanilla LLM。
`;
}

// 輔助函數：逸出 CSV 特殊字元
function escapeCSV(value: string): string {
  if (!value) return '';
  // 如果包含逗號、換行或雙引號，用雙引號包圍並逸出內部雙引號
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// 輔助函數：下載檔案
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  exportToCsv,
  exportToJson,
  generateSummaryReport,
};
