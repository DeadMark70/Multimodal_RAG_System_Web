import { useCallback, useEffect, useMemo, useState } from 'react';
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
import ThinkingConfigControl from './ThinkingConfigControl';

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
  thinking_level: null,
  thinking_include_thoughts: false,
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
  return 'Unknown error';
};

const isAuthErrorMessage = (message: string): boolean => {
  const text = message.toLowerCase();
  return (
    text.includes('authorization') ||
    text.includes('unauthorized') ||
    text.includes('auth') ||
    text.includes('missing authorization header') ||
    text.includes('401')
  );
};

function applyModelDefaults(form: ModelConfigInput, model: AvailableModel | undefined): ModelConfigInput {
  if (!model) {
    return form;
  }

  const capability = model.thinking;
  return {
    ...form,
    model_name: model.name,
    max_input_tokens: Math.min(form.max_input_tokens, model.input_token_limit ?? form.max_input_tokens),
    max_output_tokens: Math.min(form.max_output_tokens, model.output_token_limit ?? form.max_output_tokens),
    thinking_mode: Boolean(capability?.supported),
    thinking_budget:
      capability?.control_type === 'budget'
        ? capability.default_budget ?? form.thinking_budget ?? 8192
        : null,
    thinking_level:
      capability?.control_type === 'level'
        ? capability.default_level ?? 'medium'
        : null,
  };
}

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

  const reload = useCallback(async (forceRefreshModels = false) => {
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

    const combinedMessage = [modelErrorMessage, configErrorMessage].filter(Boolean).join(' | ');
    const authRelated = combinedMessage ? isAuthErrorMessage(combinedMessage) : false;

    if (modelsResult.status === 'fulfilled') {
      const availableModels = modelsResult.value;
      setModels(availableModels);
      setForm((prev) => {
        if (prev.model_name || availableModels.length === 0) {
          return prev;
        }
        return applyModelDefaults(prev, availableModels[0]);
      });
    } else {
      setModels([]);
    }

    if (configsResult.status === 'fulfilled') {
      setConfigs(configsResult.value);
    } else {
      setConfigs([]);
    }

    if (combinedMessage) {
      setModelLoadError(
        authRelated
          ? 'Could not load evaluation model settings. Sign in again and retry.'
          : modelErrorMessage ?? configErrorMessage ?? 'Could not load evaluation model settings.'
      );
    } else {
      setModelLoadError(null);
    }

    if (combinedMessage && !toast.isActive('evaluation-model-config-load-error')) {
      toast({
        id: 'evaluation-model-config-load-error',
        title: authRelated ? 'Authentication required' : 'Model settings unavailable',
        description: combinedMessage,
        status: authRelated ? 'error' : 'warning',
      });
    }

    if (forceRefreshModels) {
      setRefreshingModels(false);
    } else {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      thinking_budget: config.thinking_budget ?? null,
      thinking_level: config.thinking_level ?? null,
      thinking_include_thoughts: config.thinking_include_thoughts ?? false,
    });
  };

  const resetForm = () => {
    setSelectedConfigId(null);
    const next = {
      ...defaultConfigState(),
      model_name: models[0]?.name ?? '',
      max_input_tokens: models[0]?.input_token_limit ?? 8192,
      max_output_tokens: Math.min(8192, models[0]?.output_token_limit ?? 8192),
    };
    setForm(applyModelDefaults(next, models[0]));
  };

  const handleModelChange = (modelName: string) => {
    const model = models.find((item) => item.name === modelName);
    setForm((prev) => applyModelDefaults({ ...prev, model_name: modelName }, model));
  };

  const saveConfig = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'Preset name is required', status: 'warning' });
      return;
    }
    if (!form.model_name) {
      toast({ title: 'Select a model before saving', status: 'warning' });
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
        title: selectedConfigId ? 'Preset updated' : 'Preset created',
        status: 'success',
      });
      resetForm();
      await reload();
    } catch (error) {
      toast({
        title: 'Could not save preset',
        description: toErrorMessage(error),
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeConfig = async (configId: string) => {
    try {
      await deleteModelConfig(configId);
      toast({ title: 'Preset deleted', status: 'success' });
      if (selectedConfigId === configId) {
        resetForm();
      }
      await reload();
    } catch (error) {
      toast({
        title: 'Could not delete preset',
        description: toErrorMessage(error),
        status: 'error',
      });
    }
  };

  if (loading) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>Loading model settings...</Text>
      </HStack>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" align="center">
        <HStack>
          <Badge colorScheme="blue">Available models {models.length}</Badge>
          <Badge colorScheme="teal">Saved presets {configs.length}</Badge>
        </HStack>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            isLoading={refreshingModels}
            onClick={() => void reload(true)}
          >
            Refresh models
          </Button>
          <Button size="sm" variant="outline" onClick={resetForm}>
            New preset
          </Button>
        </HStack>
      </HStack>

      {modelLoadError && (
        <Text color="orange.500" fontSize="sm">
          {modelLoadError}
        </Text>
      )}

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={4}>
        <GridItem>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Preset name</FormLabel>
                <Input
                  value={form.name ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Gemini Flash Balanced"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Model</FormLabel>
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
                    placeholder="gemini-2.5-flash"
                  />
                )}
                {selectedModel && (
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Input limit {selectedModel.input_token_limit ?? '-'} / Output limit{' '}
                    {selectedModel.output_token_limit ?? '-'}
                  </Text>
                )}
              </FormControl>

              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
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
              </Grid>

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

              <ThinkingConfigControl
                selectedModel={selectedModel}
                form={form}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              />

              <HStack>
                <Button colorScheme="brand" isLoading={saving} onClick={() => void saveConfig()}>
                  {selectedConfigId ? 'Update preset' : 'Create preset'}
                </Button>
                {selectedConfigId && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel edit
                  </Button>
                )}
              </HStack>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text fontWeight="700" mb={3}>
              Saved presets
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
                      Use
                    </Button>
                    <Button size="xs" colorScheme="red" variant="outline" onClick={() => void removeConfig(config.id)}>
                      Delete
                    </Button>
                  </HStack>
                </Box>
              ))}
              {configs.length === 0 && <Text color="gray.500">No saved presets.</Text>}
            </VStack>
          </Box>
        </GridItem>
      </Grid>
    </VStack>
  );
}


