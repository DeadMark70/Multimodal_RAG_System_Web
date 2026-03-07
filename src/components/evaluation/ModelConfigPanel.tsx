import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spinner,
  Stack,
  Switch,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  createModelConfig,
  deleteModelConfig,
  listAvailableModels,
  listModelConfigs,
  updateModelConfig,
} from '../../services/evaluationApi';
import type { AvailableModel, ModelConfig, ModelConfigInput } from '../../types/evaluation';

const defaultConfigState = (): ModelConfigInput => ({
  name: '',
  model_name: '',
  temperature: 0.7,
  top_p: 0.95,
  top_k: 40,
  max_input_tokens: 8192,
  max_output_tokens: 8192,
  thinking_mode: false,
  thinking_budget: 8192,
});

const toErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage) {
      return maybeMessage;
    }
  }
  return '未知錯誤';
};

const isAuthErrorMessage = (message: string): boolean => {
  const text = message.toLowerCase();
  return (
    text.includes('authorization') ||
    text.includes('unauthorized') ||
    text.includes('auth') ||
    text.includes('missing authorization header') ||
    text.includes('401') ||
    text.includes('認證')
  );
};

export default function ModelConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelConfigInput>(defaultConfigState);
  const toast = useToast();

  const reload = async (forceRefreshModels = false) => {
    if (forceRefreshModels) {
      setRefreshingModels(true);
    } else {
      setLoading(true);
    }

    const [modelsResult, configsResult] = await Promise.allSettled([
      listAvailableModels(forceRefreshModels),
      listModelConfigs(),
    ]);

    const modelErrorMessage =
      modelsResult.status === 'rejected' ? toErrorMessage(modelsResult.reason) : null;
    const configErrorMessage =
      configsResult.status === 'rejected' ? toErrorMessage(configsResult.reason) : null;

    const firstAuthError = [modelErrorMessage, configErrorMessage].find(
      (message): message is string => Boolean(message && isAuthErrorMessage(message))
    );

    const bothFailed =
      modelsResult.status === 'rejected' && configsResult.status === 'rejected';
    if (bothFailed) {
      const combinedMessage = [modelErrorMessage, configErrorMessage].filter(Boolean).join(' | ');
      const authRelated = isAuthErrorMessage(combinedMessage);

      setModels([]);
      setConfigs([]);
      setModelLoadError(
        authRelated
          ? '登入狀態已失效，請重新登入後再試。'
          : '模型與預設組載入失敗，請稍後重試。'
      );

      const toastId = authRelated ? 'evaluation-auth-error' : 'evaluation-load-error';
      if (!toast.isActive(toastId)) {
        toast({
          id: toastId,
          title: authRelated ? '登入狀態已失效' : '載入失敗',
          description: authRelated
            ? '請重新登入後再載入模型與預設組。'
            : combinedMessage || '請稍後再試。',
          status: authRelated ? 'error' : 'warning',
        });
      }
      if (forceRefreshModels) {
        setRefreshingModels(false);
      } else {
        setLoading(false);
      }
      return;
    }

    if (firstAuthError) {
      setModels([]);
      setConfigs([]);
      setModelLoadError('登入狀態已失效，請重新登入後再試。');
      if (!toast.isActive('evaluation-auth-error')) {
        toast({
          id: 'evaluation-auth-error',
          title: '登入狀態已失效',
          description: '請重新登入後再載入模型與預設組。',
          status: 'error',
        });
      }
      if (forceRefreshModels) {
        setRefreshingModels(false);
      } else {
        setLoading(false);
      }
      return;
    }

    if (modelsResult.status === 'fulfilled') {
      const availableModels = modelsResult.value;
      setModels(availableModels);
      setModelLoadError(null);
      if (!form.model_name && availableModels.length > 0) {
        setForm((prev) => ({
          ...prev,
          model_name: availableModels[0].name,
          max_input_tokens: availableModels[0].input_token_limit ?? prev.max_input_tokens,
          max_output_tokens: Math.min(
            prev.max_output_tokens,
            availableModels[0].output_token_limit ?? prev.max_output_tokens
          ),
        }));
      }
    } else {
      const message = modelErrorMessage ?? '未知錯誤';
      setModelLoadError(message);
      toast({
        title: '模型列表載入失敗',
        description: message,
        status: 'warning',
      });
    }

    if (configsResult.status === 'fulfilled') {
      setConfigs(configsResult.value);
    } else {
      setConfigs([]);
      toast({
        title: '載入模型預設組失敗',
        description: configErrorMessage ?? '未知錯誤',
        status: 'error',
      });
    }

    if (forceRefreshModels) {
      setRefreshingModels(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const selectedModel = useMemo(
    () => models.find((item) => item.name === form.model_name) ?? null,
    [models, form.model_name]
  );

  const maxInputLimit = selectedModel?.input_token_limit ?? 1_000_000;
  const maxOutputLimit = selectedModel?.output_token_limit ?? 100_000;

  const applyConfig = (config: ModelConfig) => {
    setSelectedConfigId(config.id);
    setForm({
      id: config.id,
      name: config.name,
      model_name: config.model_name,
      temperature: config.temperature,
      top_p: config.top_p,
      top_k: config.top_k,
      max_input_tokens: config.max_input_tokens,
      max_output_tokens: config.max_output_tokens,
      thinking_mode: config.thinking_mode,
      thinking_budget: config.thinking_budget,
    });
  };

  const resetForm = () => {
    setSelectedConfigId(null);
    setForm({
      ...defaultConfigState(),
      model_name: models[0]?.name ?? '',
      max_input_tokens: models[0]?.input_token_limit ?? 8192,
      max_output_tokens: Math.min(8192, models[0]?.output_token_limit ?? 8192),
    });
  };

  const handleModelChange = (modelName: string) => {
    const model = models.find((item) => item.name === modelName);
    setForm((prev) => ({
      ...prev,
      model_name: modelName,
      max_input_tokens: Math.min(prev.max_input_tokens, model?.input_token_limit ?? prev.max_input_tokens),
      max_output_tokens: Math.min(prev.max_output_tokens, model?.output_token_limit ?? prev.max_output_tokens),
    }));
  };

  const saveConfig = async () => {
    if (!form.name?.trim()) {
      toast({ title: '請輸入預設組名稱', status: 'warning' });
      return;
    }
    if (!form.model_name) {
      toast({ title: '請選擇模型', status: 'warning' });
      return;
    }

    setSaving(true);
    try {
      if (selectedConfigId) {
        await updateModelConfig(selectedConfigId, form);
      } else {
        await createModelConfig(form);
      }
      toast({
        title: selectedConfigId ? '預設組已更新' : '預設組已建立',
        status: 'success',
      });
      resetForm();
      await reload();
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeConfig = async (configId: string) => {
    try {
      await deleteModelConfig(configId);
      toast({ title: '預設組已刪除', status: 'success' });
      if (selectedConfigId === configId) {
        resetForm();
      }
      await reload();
    } catch (error) {
      toast({
        title: '刪除失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    }
  };

  if (loading) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>載入模型與設定中...</Text>
      </HStack>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between">
        <HStack>
          <Badge colorScheme="blue">可用模型 {models.length}</Badge>
          <Badge colorScheme="teal">預設組 {configs.length}</Badge>
        </HStack>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            isLoading={refreshingModels}
            onClick={() => void reload(true)}
          >
            重新整理模型
          </Button>
          <Button size="sm" variant="outline" onClick={resetForm}>
            新增模式
          </Button>
        </HStack>
      </HStack>
      {modelLoadError && (
        <Text color="orange.500" fontSize="sm">
          模型列表暫時無法動態取得，請稍後重試或先手動輸入模型名稱。
        </Text>
      )}

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={4}>
        <GridItem>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Stack spacing={3}>
              <FormControl isRequired>
                <FormLabel>預設組名稱</FormLabel>
                <Input
                  value={form.name ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="例如：Gemini Flash Balanced"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>模型</FormLabel>
                {models.length > 0 ? (
                  <Select value={form.model_name} onChange={(event) => handleModelChange(event.target.value)}>
                    {models.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.display_name || model.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={form.model_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, model_name: event.target.value }))}
                    placeholder="例如：gemini-2.5-flash"
                  />
                )}
                {selectedModel && (
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Input 上限 {selectedModel.input_token_limit ?? '-'} / Output 上限 {selectedModel.output_token_limit ?? '-'}
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Temperature: {form.temperature.toFixed(2)}</FormLabel>
                <Slider
                  value={form.temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={(value) => setForm((prev) => ({ ...prev, temperature: value }))}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Top P: {form.top_p.toFixed(2)}</FormLabel>
                <Slider
                  value={form.top_p}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(value) => setForm((prev) => ({ ...prev, top_p: value }))}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <FormLabel>Top K: {form.top_k}</FormLabel>
                <Slider
                  value={form.top_k}
                  min={1}
                  max={100}
                  step={1}
                  onChange={(value) => setForm((prev) => ({ ...prev, top_k: value }))}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
                <GridItem>
                  <FormControl>
                    <FormLabel>Max Input Tokens</FormLabel>
                    <NumberInput
                      value={form.max_input_tokens}
                      min={1}
                      max={maxInputLimit}
                      onChange={(_, valueAsNumber) =>
                        setForm((prev) => ({
                          ...prev,
                          max_input_tokens: Number.isFinite(valueAsNumber) ? valueAsNumber : prev.max_input_tokens,
                        }))
                      }
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>Max Output Tokens</FormLabel>
                    <NumberInput
                      value={form.max_output_tokens}
                      min={1}
                      max={maxOutputLimit}
                      onChange={(_, valueAsNumber) =>
                        setForm((prev) => ({
                          ...prev,
                          max_output_tokens: Number.isFinite(valueAsNumber) ? valueAsNumber : prev.max_output_tokens,
                        }))
                      }
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </GridItem>
              </Grid>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Thinking Mode</FormLabel>
                <Switch
                  isChecked={form.thinking_mode}
                  onChange={(event) => setForm((prev) => ({ ...prev, thinking_mode: event.target.checked }))}
                />
              </FormControl>

              <FormControl isDisabled={!form.thinking_mode}>
                <FormLabel>Thinking Budget: {form.thinking_budget}</FormLabel>
                <Slider
                  value={form.thinking_budget}
                  min={1024}
                  max={32768}
                  step={1024}
                  onChange={(value) => setForm((prev) => ({ ...prev, thinking_budget: value }))}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <HStack>
                <Button colorScheme="brand" isLoading={saving} onClick={() => void saveConfig()}>
                  {selectedConfigId ? '更新預設組' : '儲存預設組'}
                </Button>
                {selectedConfigId && (
                  <Button variant="outline" onClick={resetForm}>
                    取消編輯
                  </Button>
                )}
              </HStack>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text fontWeight="700" mb={3}>
              已儲存預設組
            </Text>
            <VStack align="stretch" spacing={2}>
              {configs.map((config) => (
                <Box key={config.id} borderWidth="1px" borderRadius="md" p={3}>
                  <Text fontWeight="600">{config.name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {config.model_name}
                  </Text>
                  <HStack mt={2}>
                    <Button size="xs" onClick={() => applyConfig(config)}>
                      套用
                    </Button>
                    <Button size="xs" colorScheme="red" variant="outline" onClick={() => void removeConfig(config.id)}>
                      刪除
                    </Button>
                  </HStack>
                </Box>
              ))}
              {configs.length === 0 && <Text color="gray.500">尚未儲存任何預設組</Text>}
            </VStack>
          </Box>
        </GridItem>
      </Grid>
    </VStack>
  );
}
