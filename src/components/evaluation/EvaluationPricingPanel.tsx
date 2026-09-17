import { useEffect, useState } from 'react';
import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { getEvaluationPricing, refreshEvaluationPricing } from '../../services/evaluationApi';
import type { EvaluationPricingStatus } from '../../services/evaluationApi';

export default function EvaluationPricingPanel() {
  const [status, setStatus] = useState<EvaluationPricingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try { const data = await getEvaluationPricing(); if (active) setStatus(data); }
      catch { if (active) setError(true); }
    }
    void load();
    return () => { active = false; };
  }, []);
  async function refresh() {
    setBusy(true); setError(false);
    try { setStatus(await refreshEvaluationPricing()); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return <Box borderWidth="1px" borderRadius="md" p={3}>
    <HStack justify="space-between" flexWrap="wrap" gap={2}>
      <Text fontWeight="medium">Gemini API 價格（估算用）</Text>
      <Button size="sm" variant="outline" isLoading={busy} isDisabled={status?.status === 'manual' || status?.status === 'invalid_manual_price'} onClick={() => void refresh()}>更新官方價格</Button>
    </HStack>
    <Text fontSize="sm">最後同步：{status?.fetched_at ? new Date(status.fetched_at).toLocaleString() : '尚無資料'} · {status?.model_count ?? 0} 個模型</Text>
    {status?.status === 'manual' ? <Text fontSize="sm">目前使用伺服器指定的價格檔案；自動同步已停用。</Text> : null}
    {status?.status === 'invalid_manual_price' ? <Text fontSize="sm" color="orange.600">伺服器指定的價格檔案無法讀取，請修正檔案或移除手動設定。費用暫時顯示 N/A，評估可繼續執行。</Text> : null}
    {status?.evaluator_model ? <Text fontSize="sm">目前預設評分模型：{status.evaluator_model}（與作答模型分開）</Text> : null}
    <Text fontSize="xs" color="text.secondary">每天同步 Google 公開 API 價格。費用按呼叫當時的模型、服務等級及快取用量估算；歷史估算保留原價格版本。</Text>
    {error || status?.status === 'sync_failed' ? <Text fontSize="sm" color="orange.600">價格同步失敗，保留上次資料；評估可繼續執行。</Text> : null}
  </Box>;
}
