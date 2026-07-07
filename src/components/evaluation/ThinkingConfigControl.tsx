import {
  Badge,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react';
import type { AvailableModel, ModelConfigInput, ThinkingLevel } from '../../types/evaluation';

interface ThinkingConfigControlProps {
  selectedModel: AvailableModel | null;
  form: ModelConfigInput;
  onChange: (patch: Partial<ModelConfigInput>) => void;
}

const LEVEL_LABELS: Record<ThinkingLevel, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function ThinkingConfigControl({
  selectedModel,
  form,
  onChange,
}: ThinkingConfigControlProps) {
  const capability = selectedModel?.thinking;

  if (!capability || capability.control_type === 'none' || !capability.supported) {
    return (
      <Stack spacing={2}>
        <HStack>
          <Text fontWeight="600">Reasoning</Text>
          <Badge colorScheme="gray">Unavailable</Badge>
        </HStack>
        <Text color="gray.500" fontSize="sm">
          This model does not expose configurable thinking controls.
        </Text>
      </Stack>
    );
  }

  const budgetMin = capability.budget_min ?? 0;
  const budgetMax = capability.budget_max ?? 32768;
  const budgetValue = form.thinking_budget ?? capability.default_budget ?? budgetMin;

  return (
    <Stack spacing={3}>
      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0}>Thinking Mode</FormLabel>
        <Switch
          isChecked={form.thinking_mode}
          onChange={(event) => onChange({ thinking_mode: event.target.checked })}
        />
      </FormControl>

      {capability.control_type === 'budget' && (
        <Stack spacing={3} opacity={form.thinking_mode ? 1 : 0.55}>
          <HStack justify="space-between" align="center">
            <FormLabel mb={0}>Thinking Budget: {budgetValue}</FormLabel>
            <ButtonGroup size="xs" isAttached variant="outline">
              {capability.supports_disable && (
                <Button onClick={() => onChange({ thinking_budget: 0, thinking_level: null })}>
                  Off
                </Button>
              )}
              {capability.supports_dynamic && (
                <Button onClick={() => onChange({ thinking_budget: -1, thinking_level: null })}>
                  Dynamic
                </Button>
              )}
              <Button
                onClick={() =>
                  onChange({
                    thinking_budget: capability.default_budget ?? budgetMin,
                    thinking_level: null,
                  })
                }
              >
                Default
              </Button>
            </ButtonGroup>
          </HStack>
          <Slider
            value={budgetValue < budgetMin ? budgetMin : budgetValue}
            min={budgetMin}
            max={budgetMax}
            step={1024}
            isDisabled={!form.thinking_mode}
            onChange={(value) => onChange({ thinking_budget: value, thinking_level: null })}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <NumberInput
            value={budgetValue}
            min={capability.supports_dynamic ? -1 : budgetMin}
            max={budgetMax}
            isDisabled={!form.thinking_mode}
            onChange={(_, valueAsNumber) =>
              onChange({
                thinking_budget: Number.isFinite(valueAsNumber) ? valueAsNumber : budgetValue,
                thinking_level: null,
              })
            }
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </Stack>
      )}

      {capability.control_type === 'level' && (
        <Stack spacing={2} opacity={form.thinking_mode ? 1 : 0.55}>
          <FormLabel mb={0}>Thinking Level</FormLabel>
          <ButtonGroup size="sm" variant="outline" isDisabled={!form.thinking_mode}>
            {capability.levels.map((level) => (
              <Button
                key={level}
                colorScheme={form.thinking_level === level ? 'blue' : 'gray'}
                variant={form.thinking_level === level ? 'solid' : 'outline'}
                onClick={() => onChange({ thinking_level: level, thinking_budget: null })}
              >
                {LEVEL_LABELS[level]}
              </Button>
            ))}
          </ButtonGroup>
        </Stack>
      )}

      {capability.guidance && (
        <Text color="gray.500" fontSize="sm">
          {capability.guidance}
        </Text>
      )}
    </Stack>
  );
}


