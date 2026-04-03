import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Select,
  Spinner,
  Stack,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiInfo,
  FiMinus,
} from "react-icons/fi";
import {
  evaluateCampaign,
  getCampaignMetrics,
  listCampaigns,
} from "../../services/evaluationApi";
import type {
  CampaignMetricName,
  CampaignMetricRow,
  CampaignMetricsResponse,
  CampaignMode,
  CampaignStatus,
  DeltaGroupSummary,
  DeltaModeSummary,
  GroupMetricsSummary,
  ModeMetricsSummary,
} from "../../types/evaluation";
import StabilityChart from "../charts/StabilityChart";

const MODE_LABELS: Record<CampaignMode, string> = {
  naive: "Naive",
  advanced: "Advanced",
  graph: "Graph",
  agentic: "Agentic",
};

type EcrDirection = "positive" | "neutral" | "negative";

interface FlattenedDeltaRow {
  groupKey: string;
  summary: DeltaModeSummary;
}

interface DeltaViewConfig {
  key: "category" | "difficulty" | "question";
  label: string;
  description: string;
  groupLabel: string;
  emptyMessage: string;
  rows: FlattenedDeltaRow[];
  maxAbsDelta: number;
}

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function metricLabel(metric: string): string {
  return metric
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function ecrLabel(ecr?: number | null): string {
  if (ecr == null) {
    return "N/A";
  }
  return `${ecr.toFixed(2)}`;
}

function signedDeltaLabel(delta?: number | null, digits = 3): string {
  if (delta == null) {
    return "N/A";
  }
  if (Math.abs(delta) < Number.EPSILON) {
    return "0";
  }
  return `${delta > 0 ? "+" : ""}${delta.toFixed(digits)}`;
}

function normalizeEcrNote(note?: string | null): string {
  if (!note) {
    return "-";
  }
  if (note === "baseline_missing") {
    return "baseline_missing";
  }
  if (note === "non_positive_marginal_cost") {
    return "non_positive_marginal_cost";
  }
  if (note === "marginal_cost_too_small") {
    return "marginal_cost_too_small";
  }
  if (note === "insufficient_valid_samples") {
    return "insufficient_valid_samples";
  }
  return note;
}

function maxAbs(values: Array<number | null | undefined>): number {
  return values.reduce<number>((largest, value) => {
    if (typeof value !== "number") {
      return largest;
    }
    return Math.max(largest, Math.abs(value));
  }, 0);
}

function deltaTone(value?: number | null): string {
  if (value == null) {
    return "text.secondary";
  }
  if (value > 0) {
    return "success.500";
  }
  if (value < 0) {
    return "error.500";
  }
  return "surface.500";
}

function deltaTrackTone(value?: number | null): string {
  if (value == null) {
    return "surface.300";
  }
  if (value > 0) {
    return "success.500";
  }
  if (value < 0) {
    return "error.500";
  }
  return "surface.400";
}

function ecrTone(ecr?: number | null): string {
  if (ecr == null) {
    return "text.secondary";
  }
  if (ecr > 2) {
    return "success.500";
  }
  if (ecr >= 1) {
    return "warning.500";
  }
  return "error.500";
}

function directionTone(direction?: EcrDirection): string {
  if (!direction || direction === "neutral") {
    return "surface.500";
  }
  if (direction === "positive") {
    return "success.500";
  }
  return "error.500";
}

function directionLabel(direction?: EcrDirection): string {
  if (!direction || direction === "neutral") {
    return "Stable";
  }
  return direction === "positive" ? "Up" : "Down";
}

function directionIcon(direction?: EcrDirection) {
  if (!direction || direction === "neutral") {
    return FiMinus;
  }
  return direction === "positive" ? FiArrowUpRight : FiArrowDownRight;
}

function questionDelta(
  metrics: CampaignMetricsResponse,
  questionId: string,
  mode: CampaignMode,
): DeltaModeSummary | null {
  const group = metrics.delta_by_question?.[questionId];
  if (!group) {
    return null;
  }
  return group.by_mode?.[mode] ?? null;
}

function metricValueLabel(row: CampaignMetricRow, metric: string): string {
  if (row.invalid_metrics?.[metric]) {
    return "N/A";
  }
  const value = row.metric_values?.[metric];
  if (value == null) {
    return "N/A";
  }
  return value.toFixed(3);
}

function metricsToCsv(
  metrics: CampaignMetricsResponse,
  selectedMetric: CampaignMetricName,
): string {
  const metricHeaders = metrics.available_metrics;
  const headers = [
    "campaign_result_id",
    "question_id",
    "question",
    "mode",
    "run_number",
    "category",
    "difficulty",
    "ragas_focus",
    "reference_source",
    "total_tokens",
    "selected_metric",
    "selected_metric_value",
    "selected_metric_invalid",
    "invalid_reason",
    "delta_answer_correctness",
    "delta_faithfulness",
    "delta_total_tokens",
    "ecr",
    "ecr_note",
    "ecr_direction_correctness",
    "ecr_faithfulness",
    "ecr_faithfulness_note",
    "ecr_direction_faithfulness",
    ...metricHeaders,
  ];
  const rows = metrics.rows.map((row) => {
    const delta = questionDelta(metrics, row.question_id, row.mode);
    const selectedMetricInvalid = Boolean(
      row.invalid_metrics?.[selectedMetric],
    );
    const selectedMetricValue = selectedMetricInvalid
      ? ""
      : (row.metric_values[selectedMetric] ?? "");
    const invalidReason = row.invalid_reasons?.[selectedMetric] ?? "";
    return [
      row.campaign_result_id,
      row.question_id,
      row.question,
      row.mode,
      row.run_number,
      row.category,
      row.difficulty,
      row.ragas_focus.join("|"),
      row.reference_source,
      row.total_tokens,
      selectedMetric,
      selectedMetricValue,
      selectedMetricInvalid,
      invalidReason,
      delta?.delta_answer_correctness ?? "",
      delta?.delta_faithfulness ?? "",
      delta?.delta_total_tokens ?? "",
      delta?.ecr ?? "",
      delta?.ecr_note ?? "",
      delta?.ecr_direction_correctness ?? "",
      delta?.ecr_faithfulness ?? "",
      delta?.ecr_faithfulness_note ?? "",
      delta?.ecr_direction_faithfulness ?? "",
      ...metricHeaders.map((metric) => row.metric_values[metric] ?? 0),
    ]
      .map(csvCell)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

function metricMean(
  summary: GroupMetricsSummary | ModeMetricsSummary | undefined,
  metric: string,
): number {
  return summary?.metric_summaries?.[metric]?.mean ?? 0;
}

function metricMax(
  summary: GroupMetricsSummary | ModeMetricsSummary | undefined,
  metric: string,
): number {
  return summary?.metric_summaries?.[metric]?.max ?? 0;
}

function metricStd(
  summary: GroupMetricsSummary | ModeMetricsSummary | undefined,
  metric: string,
): number {
  return summary?.metric_summaries?.[metric]?.stddev ?? 0;
}

function sortedGroupEntries(
  groups: Record<string, GroupMetricsSummary>,
): GroupMetricsSummary[] {
  return Object.values(groups).sort((left, right) =>
    left.group_key.localeCompare(right.group_key),
  );
}

function sortedDeltaGroupEntries(
  groups: Record<string, DeltaGroupSummary>,
): DeltaGroupSummary[] {
  return Object.values(groups).sort((left, right) =>
    left.group_key.localeCompare(right.group_key),
  );
}

function flattenDeltaGroups(groups: DeltaGroupSummary[]): FlattenedDeltaRow[] {
  return groups.flatMap((group) =>
    Object.values(group.by_mode)
      .filter((summary): summary is DeltaModeSummary => summary !== undefined)
      .sort((left, right) => left.mode.localeCompare(right.mode))
      .map((summary) => ({ groupKey: group.group_key, summary })),
  );
}

function ScrollableTable({ children }: { children: ReactNode }) {
  return (
    <Box
      overflowX="auto"
      pb={1}
      sx={{ "&::-webkit-scrollbar": { height: "10px" } }}
    >
      {children}
    </Box>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="xl"
      boxShadow="panel.base"
      p={5}
    >
      <Box mb={4}>
        <Heading size="md">{title}</Heading>
        {description ? (
          <Text mt={1} color="text.secondary" fontSize="sm">
            {description}
          </Text>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

function DeltaMetricCell({
  value,
  digits = 3,
  maxValue,
}: {
  value?: number | null;
  digits?: number;
  maxValue: number;
}) {
  if (value == null) {
    return (
      <Text color="text.secondary" fontSize="sm">
        N/A
      </Text>
    );
  }

  const width =
    maxValue > 0
      ? Math.max((Math.abs(value) / maxValue) * 100, value === 0 ? 0 : 8)
      : 0;

  return (
    <Stack spacing={1} align="flex-end" minW="96px">
      <Text
        color={deltaTone(value)}
        fontWeight="700"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {signedDeltaLabel(value, digits)}
      </Text>
      <Box
        w="92px"
        h="1.5"
        bg="surface.100"
        borderRadius="full"
        overflow="hidden"
      >
        <Box
          h="100%"
          w={`${Math.min(width, 100)}%`}
          bg={deltaTrackTone(value)}
          borderRadius="full"
        />
      </Box>
    </Stack>
  );
}

function EcrBadge({ value }: { value?: number | null }) {
  return (
    <Badge
      px={2.5}
      py={1}
      borderRadius="full"
      bg="surface.100"
      borderWidth="1px"
      borderColor="border.subtle"
      color={ecrTone(value)}
      fontWeight="700"
    >
      {ecrLabel(value)}
    </Badge>
  );
}

function DirectionPill({ direction }: { direction?: EcrDirection }) {
  return (
    <Badge
      px={2.5}
      py={1}
      borderRadius="full"
      bg="surface.100"
      borderWidth="1px"
      borderColor="border.subtle"
      color={directionTone(direction)}
      fontWeight="700"
    >
      <HStack spacing={1}>
        <Icon as={directionIcon(direction)} boxSize={3.5} />
        <Text as="span">{directionLabel(direction)}</Text>
      </HStack>
    </Badge>
  );
}

function NoteTooltip({
  note,
  contextLabel,
}: {
  note?: string | null;
  contextLabel: string;
}) {
  const normalizedNote = normalizeEcrNote(note);
  if (normalizedNote === "-") {
    return (
      <Text color="text.secondary" fontSize="sm">
        —
      </Text>
    );
  }

  return (
    <Tooltip label={normalizedNote} hasArrow openDelay={150}>
      <Badge
        as="span"
        px={2.5}
        py={1}
        borderRadius="full"
        bg="surface.100"
        borderWidth="1px"
        borderColor="border.subtle"
        color="text.secondary"
        fontWeight="700"
        cursor="help"
        aria-label={`${contextLabel}: ${normalizedNote}`}
      >
        <HStack spacing={1}>
          <Icon as={FiInfo} boxSize={3.5} />
          <Text as="span">Note</Text>
        </HStack>
      </Badge>
    </Tooltip>
  );
}

function DeltaTable({
  rows,
  groupLabel,
  emptyMessage,
  maxAbsDelta,
}: {
  rows: FlattenedDeltaRow[];
  groupLabel: string;
  emptyMessage: string;
  maxAbsDelta: number;
}) {
  const stickyCellProps = {
    position: "sticky" as const,
    left: 0,
    bg: "bg.panel",
    zIndex: 1,
    borderRightWidth: "1px",
    borderRightColor: "border.subtle",
  };

  return (
    <ScrollableTable>
      <Table size="sm" variant="simple" minW="1160px">
        <Thead>
          <Tr>
            <Th {...stickyCellProps} zIndex={2}>
              {groupLabel}
            </Th>
            <Th>Mode</Th>
            <Th isNumeric>Samples</Th>
            <Th isNumeric>Δ Correctness</Th>
            <Th isNumeric>Δ Faithfulness</Th>
            <Th isNumeric>Δ Tokens</Th>
            <Th>ECR(C)</Th>
            <Th>Dir(C)</Th>
            <Th>Why(C)</Th>
            <Th>ECR(F)</Th>
            <Th>Dir(F)</Th>
            <Th>Why(F)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map(({ groupKey, summary }) => (
            <Tr key={`${groupKey}-${summary.mode}`}>
              <Td {...stickyCellProps} fontWeight="600">
                {groupKey}
              </Td>
              <Td>{MODE_LABELS[summary.mode]}</Td>
              <Td isNumeric>{summary.sample_count}</Td>
              <Td isNumeric>
                <DeltaMetricCell
                  value={summary.delta_answer_correctness}
                  maxValue={maxAbsDelta}
                />
              </Td>
              <Td isNumeric>
                <DeltaMetricCell
                  value={summary.delta_faithfulness}
                  maxValue={maxAbsDelta}
                />
              </Td>
              <Td isNumeric>
                <DeltaMetricCell
                  value={summary.delta_total_tokens}
                  digits={1}
                  maxValue={maxAbsDelta}
                />
              </Td>
              <Td>
                <EcrBadge value={summary.ecr} />
              </Td>
              <Td>
                <DirectionPill direction={summary.ecr_direction_correctness} />
              </Td>
              <Td>
                <NoteTooltip
                  note={summary.ecr_note}
                  contextLabel={`${groupLabel} correctness note`}
                />
              </Td>
              <Td>
                <EcrBadge value={summary.ecr_faithfulness} />
              </Td>
              <Td>
                <DirectionPill direction={summary.ecr_direction_faithfulness} />
              </Td>
              <Td>
                <NoteTooltip
                  note={summary.ecr_faithfulness_note}
                  contextLabel={`${groupLabel} faithfulness note`}
                />
              </Td>
            </Tr>
          ))}
          {rows.length === 0 ? (
            <Tr>
              <Td colSpan={12}>
                <Text color="text.secondary" py={2}>
                  {emptyMessage}
                </Text>
              </Td>
            </Tr>
          ) : null}
        </Tbody>
      </Table>
    </ScrollableTable>
  );
}

export default function EvaluationResults() {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedMetric, setSelectedMetric] =
    useState<CampaignMetricName>("answer_correctness");
  const [metrics, setMetrics] = useState<CampaignMetricsResponse | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [deltaTabIndex, setDeltaTabIndex] = useState(0);
  const toast = useToast();

  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const reloadCampaigns = useCallback(async () => {
    const items = await listCampaigns();
    setCampaigns(items);
    setSelectedCampaignId((current) => {
      if (current && items.some((campaign) => campaign.id === current)) {
        return current;
      }
      return items[0]?.id ?? "";
    });
    return items;
  }, []);

  const loadMetrics = useCallback(
    async (campaignId: string) => {
      setLoadingMetrics(true);
      try {
        const response = await getCampaignMetrics(campaignId);
        setMetrics(response);
      } catch (error) {
        toast({
          title: "載入分析結果失敗",
          description: error instanceof Error ? error.message : "未知錯誤",
          status: "error",
        });
      } finally {
        setLoadingMetrics(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingCampaigns(true);
      try {
        const items = await listCampaigns();
        if (!mounted) {
          return;
        }
        setCampaigns(items);
        setSelectedCampaignId(items[0]?.id ?? "");
      } catch (error) {
        toast({
          title: "載入 campaigns 失敗",
          description: error instanceof Error ? error.message : "未知錯誤",
          status: "error",
        });
      } finally {
        if (mounted) {
          setLoadingCampaigns(false);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setMetrics(null);
      return;
    }
    void loadMetrics(selectedCampaignId);
  }, [loadMetrics, selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaign || selectedCampaign.status !== "evaluating") {
      return;
    }
    const timer = window.setInterval(() => {
      void reloadCampaigns();
      void loadMetrics(selectedCampaign.id);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [loadMetrics, reloadCampaigns, selectedCampaign]);

  useEffect(() => {
    if (!metrics) {
      return;
    }
    if (metrics.available_metrics.includes(selectedMetric)) {
      return;
    }
    setSelectedMetric(
      metrics.available_metrics.includes("answer_correctness")
        ? "answer_correctness"
        : (metrics.available_metrics[0] ?? "answer_correctness"),
    );
  }, [metrics, selectedMetric]);

  const handleRerun = async () => {
    if (!selectedCampaignId) {
      return;
    }
    setRerunning(true);
    try {
      await evaluateCampaign(
        selectedCampaignId,
        selectedQuestionIds.length > 0
          ? { question_ids: selectedQuestionIds }
          : undefined,
      );
      await reloadCampaigns();
      await loadMetrics(selectedCampaignId);
      toast({
        title:
          selectedQuestionIds.length > 0
            ? `已重新啟動 RAGAS 評估（${selectedQuestionIds.length} 題）`
            : "已重新啟動 RAGAS 評估",
        status: "success",
      });
    } catch (error) {
      toast({
        title: "重新評估失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        status: "error",
      });
    } finally {
      setRerunning(false);
    }
  };

  const toggleQuestionSelection = useCallback((questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId],
    );
  }, []);

  const clearSelectedQuestions = useCallback(() => {
    setSelectedQuestionIds([]);
  }, []);

  const selectAllQuestions = useCallback(() => {
    const allQuestionIds = [
      ...new Set(metrics?.rows.map((row) => row.question_id) ?? []),
    ].sort((left, right) => left.localeCompare(right));
    setSelectedQuestionIds(allQuestionIds);
  }, [metrics]);

  const summaryEntries = useMemo(
    () =>
      Object.values(metrics?.summary_by_mode ?? {}).filter(
        (entry): entry is ModeMetricsSummary => entry !== undefined,
      ),
    [metrics],
  );

  const categoryEntries = useMemo(
    () => sortedGroupEntries(metrics?.summary_by_category ?? {}),
    [metrics],
  );

  const focusEntries = useMemo(
    () => sortedGroupEntries(metrics?.summary_by_focus ?? {}),
    [metrics],
  );

  const availableQuestionIds = useMemo(
    () =>
      [...new Set(metrics?.rows.map((row) => row.question_id) ?? [])].sort(
        (left, right) => left.localeCompare(right),
      ),
    [metrics],
  );

  const deltaCategoryRows = useMemo(
    () =>
      flattenDeltaGroups(
        sortedDeltaGroupEntries(metrics?.delta_by_category ?? {}),
      ),
    [metrics],
  );

  const deltaDifficultyRows = useMemo(
    () =>
      flattenDeltaGroups(
        sortedDeltaGroupEntries(metrics?.delta_by_difficulty ?? {}),
      ),
    [metrics],
  );

  const deltaQuestionRows = useMemo(
    () =>
      flattenDeltaGroups(
        sortedDeltaGroupEntries(metrics?.delta_by_question ?? {}),
      ),
    [metrics],
  );

  const summaryDeltaMax = useMemo(
    () =>
      maxAbs(
        summaryEntries.flatMap((entry) => [
          entry.delta_answer_correctness,
          entry.delta_faithfulness,
          entry.delta_total_tokens,
        ]),
      ),
    [summaryEntries],
  );

  const detailDeltaMax = useMemo(
    () =>
      maxAbs(
        (metrics?.rows ?? []).flatMap((row) => {
          const delta = metrics
            ? questionDelta(metrics, row.question_id, row.mode)
            : null;
          return [
            delta?.delta_answer_correctness,
            delta?.delta_faithfulness,
            delta?.delta_total_tokens,
          ];
        }),
      ),
    [metrics],
  );

  const deltaViews = useMemo<DeltaViewConfig[]>(
    () => [
      {
        key: "category",
        label: "Category Delta / ECR",
        description: "依題目類型比較不同模式的品質變化、成本變化與 ECR 方向。",
        groupLabel: "Category",
        emptyMessage: "沒有 category delta 資料。",
        rows: deltaCategoryRows,
        maxAbsDelta: maxAbs(
          deltaCategoryRows.flatMap(({ summary }) => [
            summary.delta_answer_correctness,
            summary.delta_faithfulness,
            summary.delta_total_tokens,
          ]),
        ),
      },
      {
        key: "difficulty",
        label: "Difficulty Delta / ECR",
        description: "對照不同難度層級下，各模式的進退幅度與成本效益。",
        groupLabel: "Difficulty",
        emptyMessage: "沒有 difficulty delta 資料。",
        rows: deltaDifficultyRows,
        maxAbsDelta: maxAbs(
          deltaDifficultyRows.flatMap(({ summary }) => [
            summary.delta_answer_correctness,
            summary.delta_faithfulness,
            summary.delta_total_tokens,
          ]),
        ),
      },
      {
        key: "question",
        label: "Question Delta / ECR",
        description: "逐題查看模式差異，快速找出最需要 drill down 的樣本。",
        groupLabel: "Question ID",
        emptyMessage: "沒有 question delta 資料。",
        rows: deltaQuestionRows,
        maxAbsDelta: maxAbs(
          deltaQuestionRows.flatMap(({ summary }) => [
            summary.delta_answer_correctness,
            summary.delta_faithfulness,
            summary.delta_total_tokens,
          ]),
        ),
      },
    ],
    [deltaCategoryRows, deltaDifficultyRows, deltaQuestionRows],
  );

  useEffect(() => {
    setSelectedQuestionIds((current) =>
      current.filter((questionId) => availableQuestionIds.includes(questionId)),
    );
  }, [availableQuestionIds]);

  const handleExportJson = useCallback(() => {
    if (!metrics) {
      return;
    }
    downloadTextFile(
      `campaign-${metrics.campaign.id}-metrics.json`,
      `${JSON.stringify(metrics, null, 2)}\n`,
      "application/json",
    );
  }, [metrics]);

  const handleExportCsv = useCallback(() => {
    if (!metrics) {
      return;
    }
    downloadTextFile(
      `campaign-${metrics.campaign.id}-metrics.csv`,
      metricsToCsv(metrics, selectedMetric),
      "text/csv",
    );
  }, [metrics, selectedMetric]);

  if (loadingCampaigns) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>載入結果分析...</Text>
      </HStack>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Text color="text.secondary">
        尚未建立任何 campaign，因此目前沒有可分析的結果。
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="xl"
        boxShadow="panel.base"
        p={5}
      >
        <HStack
          justify="space-between"
          align="flex-end"
          flexWrap="wrap"
          gap={4}
        >
          <Box minW={{ base: "100%", md: "320px" }}>
            <Text fontWeight="700" mb={2}>
              Campaign
            </Text>
            <Select
              value={selectedCampaignId}
              onChange={(event) => setSelectedCampaignId(event.target.value)}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name || campaign.id} ({campaign.status})
                </option>
              ))}
            </Select>
          </Box>
          <HStack spacing={3} flexWrap="wrap">
            <Button
              variant="outline"
              onClick={handleExportJson}
              isDisabled={!metrics}
            >
              匯出 JSON
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              isDisabled={!metrics}
            >
              匯出 CSV
            </Button>
            {selectedCampaign && (
              <Badge
                px={2.5}
                py={1}
                borderRadius="full"
                bg="surface.100"
                borderWidth="1px"
                borderColor="border.subtle"
                color={
                  selectedCampaign.status === "failed"
                    ? "error.500"
                    : selectedCampaign.status === "evaluating"
                      ? "brand.500"
                      : "success.500"
                }
              >
                {selectedCampaign.status}
              </Badge>
            )}
            <Button
              onClick={() => {
                void handleRerun();
              }}
              isLoading={rerunning}
              loadingText="重跑中"
            >
              {selectedQuestionIds.length > 0
                ? `重新執行 RAGAS（已選題 ${selectedQuestionIds.length}）`
                : "重新執行 RAGAS"}
            </Button>
          </HStack>
        </HStack>
        {metrics && (
          <Stack spacing={3} mt={4}>
            <Grid
              templateColumns={{
                base: "1fr",
                lg: "minmax(0, 1.4fr) minmax(260px, 0.6fr)",
              }}
              gap={4}
            >
              <GridItem>
                <Text color="text.secondary">
                  Evaluator: {metrics.evaluator_model}
                </Text>
                <Text color="text.secondary">
                  Available metrics:{" "}
                  {metrics.available_metrics.map(metricLabel).join(", ") ||
                    "None"}
                </Text>
                <Text color="text.secondary">
                  Invalid metrics:{" "}
                  {metrics.evaluation_warnings?.invalid_metric_rows ?? 0}/
                  {metrics.evaluation_warnings?.total_metric_rows ?? 0} (
                  {(
                    (metrics.evaluation_warnings?.invalid_ratio ?? 0) * 100
                  ).toFixed(1)}
                  %)
                </Text>
                {(metrics.evaluation_warnings?.invalid_metric_rows ?? 0) >
                  0 && (
                  <Text color="warning.500" fontSize="sm">
                    Invalid by metric:{" "}
                    {Object.entries(
                      metrics.evaluation_warnings?.invalid_by_metric ?? {},
                    )
                      .map(([metricName, count]) => `${metricName}:${count}`)
                      .join(", ") || "-"}
                  </Text>
                )}
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel mb={1}>目前指標</FormLabel>
                  <Select
                    value={selectedMetric}
                    onChange={(event) => setSelectedMetric(event.target.value)}
                  >
                    {metrics.available_metrics.map((metric) => (
                      <option key={metric} value={metric}>
                        {metricLabel(metric)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>
            </Grid>

            <Box
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="lg"
              bg="surface.50"
              p={3}
            >
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Text fontWeight="700">局部重跑選題（Question ID）</Text>
                <HStack>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={selectAllQuestions}
                  >
                    全選
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={clearSelectedQuestions}
                  >
                    清除
                  </Button>
                </HStack>
              </HStack>
              <Wrap>
                {availableQuestionIds.map((questionId) => (
                  <WrapItem key={questionId}>
                    <Checkbox
                      isChecked={selectedQuestionIds.includes(questionId)}
                      onChange={() => toggleQuestionSelection(questionId)}
                    >
                      {questionId}
                    </Checkbox>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          </Stack>
        )}
      </Box>

      {loadingMetrics ? (
        <HStack py={6} justify="center">
          <Spinner />
          <Text>載入分析指標...</Text>
        </HStack>
      ) : !metrics || metrics.rows.length === 0 ? (
        <Box
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="xl"
          boxShadow="panel.base"
          p={5}
        >
          <Text color="text.secondary">
            {selectedCampaign?.status === "evaluating"
              ? "RAGAS 評估進行中，結果會在完成後自動更新。"
              : "此 campaign 目前尚無可視覺化的 RAGAS 指標。"}
          </Text>
        </Box>
      ) : (
        <>
          <SectionCard
            title="模式比較總表"
            description="比較各模式在目前指標、成本與效益變化上的整體表現。"
          >
            <ScrollableTable>
              <Table size="sm" variant="simple" minW="1040px">
                <Thead>
                  <Tr>
                    <Th>Mode</Th>
                    <Th isNumeric>Samples</Th>
                    <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                    <Th isNumeric>{metricLabel(selectedMetric)} Max</Th>
                    <Th isNumeric>Stddev</Th>
                    <Th isNumeric>Tokens</Th>
                    <Th isNumeric>Δ Correctness</Th>
                    <Th isNumeric>Δ Faithfulness</Th>
                    <Th isNumeric>Δ Tokens</Th>
                    <Th>ECR(C)</Th>
                    <Th>Dir(C)</Th>
                    <Th>ECR(F)</Th>
                    <Th>Dir(F)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {summaryEntries.map((entry) => (
                    <Tr key={entry.mode}>
                      <Td fontWeight="600">{MODE_LABELS[entry.mode]}</Td>
                      <Td isNumeric>{entry.sample_count}</Td>
                      <Td isNumeric>
                        {metricMean(entry, selectedMetric).toFixed(3)}
                      </Td>
                      <Td isNumeric>
                        {metricMax(entry, selectedMetric).toFixed(3)}
                      </Td>
                      <Td isNumeric>
                        {metricStd(entry, selectedMetric).toFixed(3)}
                      </Td>
                      <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                      <Td isNumeric>
                        <DeltaMetricCell
                          value={entry.delta_answer_correctness}
                          maxValue={summaryDeltaMax}
                        />
                      </Td>
                      <Td isNumeric>
                        <DeltaMetricCell
                          value={entry.delta_faithfulness}
                          maxValue={summaryDeltaMax}
                        />
                      </Td>
                      <Td isNumeric>
                        <DeltaMetricCell
                          value={entry.delta_total_tokens}
                          digits={1}
                          maxValue={summaryDeltaMax}
                        />
                      </Td>
                      <Td>
                        <EcrBadge value={entry.ecr} />
                      </Td>
                      <Td>
                        <DirectionPill
                          direction={entry.ecr_direction_correctness}
                        />
                      </Td>
                      <Td>
                        <EcrBadge value={entry.ecr_faithfulness} />
                      </Td>
                      <Td>
                        <DirectionPill
                          direction={entry.ecr_direction_faithfulness}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </ScrollableTable>
          </SectionCard>

          <Grid
            templateColumns={{
              base: "1fr",
              "2xl": "minmax(0, 1.5fr) minmax(280px, 0.5fr)",
            }}
            gap={6}
          >
            <GridItem>
              <StabilityChart rows={metrics.rows} metric={selectedMetric} />
            </GridItem>
            <GridItem>
              <SectionCard
                title="Reference Source"
                description="檢查 correctness reference 使用短版標準答案或 fallback 長版答案的比例。"
              >
                <Stack spacing={3}>
                  <Badge
                    px={2.5}
                    py={1.5}
                    borderRadius="full"
                    bg="surface.100"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    color="brand.500"
                    alignSelf="flex-start"
                  >
                    short GT rows:{" "}
                    {
                      metrics.rows.filter(
                        (row) => row.reference_source === "ground_truth_short",
                      ).length
                    }
                  </Badge>
                  <Badge
                    px={2.5}
                    py={1.5}
                    borderRadius="full"
                    bg="surface.100"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    color="warning.500"
                    alignSelf="flex-start"
                  >
                    long fallback rows:{" "}
                    {
                      metrics.rows.filter(
                        (row) =>
                          row.reference_source === "ground_truth_fallback_long",
                      ).length
                    }
                  </Badge>
                  <Text color="text.secondary" fontSize="sm">
                    這個欄位用來檢查目前 correctness reference
                    是短版標準答案還是 fallback 到長版答案。
                  </Text>
                </Stack>
              </SectionCard>
            </GridItem>
          </Grid>

          <Stack spacing={6}>
            <SectionCard
              title="依 Category 摘要"
              description="聚合每個類別在目前指標與 token 使用量上的平均表現。"
            >
              <ScrollableTable>
                <Table size="sm" variant="simple" minW="640px">
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                      <Th isNumeric>Tokens</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categoryEntries.map((entry) => (
                      <Tr key={entry.group_key}>
                        <Td fontWeight="600">{entry.group_key}</Td>
                        <Td isNumeric>{entry.sample_count}</Td>
                        <Td isNumeric>
                          {metricMean(entry, selectedMetric).toFixed(3)}
                        </Td>
                        <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                      </Tr>
                    ))}
                    {categoryEntries.length === 0 ? (
                      <Tr>
                        <Td colSpan={4}>
                          <Text color="text.secondary" py={2}>
                            沒有 category 分組資料。
                          </Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </ScrollableTable>
            </SectionCard>

            <SectionCard
              title="依 RAGAS Focus 摘要"
              description="聚合不同評估 focus 的整體平均表現，幫助切換觀察維度。"
            >
              <ScrollableTable>
                <Table size="sm" variant="simple" minW="640px">
                  <Thead>
                    <Tr>
                      <Th>Focus</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                      <Th isNumeric>Tokens</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {focusEntries.map((entry) => (
                      <Tr key={entry.group_key}>
                        <Td fontWeight="600">{entry.group_key}</Td>
                        <Td isNumeric>{entry.sample_count}</Td>
                        <Td isNumeric>
                          {metricMean(entry, selectedMetric).toFixed(3)}
                        </Td>
                        <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                      </Tr>
                    ))}
                    {focusEntries.length === 0 ? (
                      <Tr>
                        <Td colSpan={4}>
                          <Text color="text.secondary" py={2}>
                            沒有 ragas_focus 分組資料。
                          </Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </ScrollableTable>
            </SectionCard>
          </Stack>

          <SectionCard
            title="Delta / ECR 深入分析"
            description="用分頁切換不同觀察維度，保留完整資料欄位，同時避免桌面寬度被壓縮。"
          >
            <Tabs
              index={deltaTabIndex}
              onChange={setDeltaTabIndex}
              variant="enclosed"
              isLazy
              colorScheme="brand"
            >
              <TabList overflowX="auto" overflowY="hidden" pb={1}>
                {deltaViews.map((view) => (
                  <Tab key={view.key} fontWeight="700" whiteSpace="nowrap">
                    {view.label}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {deltaViews.map((view) => (
                  <TabPanel key={view.key} px={0} pt={5}>
                    <Text color="text.secondary" fontSize="sm" mb={4}>
                      {view.description}
                    </Text>
                    <DeltaTable
                      rows={view.rows}
                      groupLabel={view.groupLabel}
                      emptyMessage={view.emptyMessage}
                      maxAbsDelta={view.maxAbsDelta}
                    />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </SectionCard>

          <SectionCard
            title="逐題明細"
            description="逐列查看實驗輸出，並對照 question-level delta / ECR 判斷異常樣本。"
          >
            <ScrollableTable>
              <Table size="sm" variant="simple" minW="1240px">
                <Thead>
                  <Tr>
                    <Th>Question</Th>
                    <Th>Mode</Th>
                    <Th>Category</Th>
                    <Th>Reference</Th>
                    <Th>Focus</Th>
                    <Th isNumeric>{metricLabel(selectedMetric)}</Th>
                    <Th isNumeric>Tokens</Th>
                    <Th isNumeric>Δ Correctness</Th>
                    <Th isNumeric>Δ Faithfulness</Th>
                    <Th isNumeric>Δ Tokens</Th>
                    <Th>ECR(C)</Th>
                    <Th>Dir(C)</Th>
                    <Th>ECR(F)</Th>
                    <Th>Dir(F)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {metrics.rows.map((row) => {
                    const delta = questionDelta(
                      metrics,
                      row.question_id,
                      row.mode,
                    );
                    return (
                      <Tr key={row.campaign_result_id}>
                        <Td maxW="520px">
                          <Text noOfLines={2}>{row.question}</Text>
                        </Td>
                        <Td>{MODE_LABELS[row.mode]}</Td>
                        <Td>{row.category ?? "-"}</Td>
                        <Td>{row.reference_source ?? "-"}</Td>
                        <Td>{row.ragas_focus.join(", ") || "-"}</Td>
                        <Td isNumeric>
                          {metricValueLabel(row, selectedMetric)}
                        </Td>
                        <Td isNumeric>{row.total_tokens}</Td>
                        <Td isNumeric>
                          <DeltaMetricCell
                            value={delta?.delta_answer_correctness}
                            maxValue={detailDeltaMax}
                          />
                        </Td>
                        <Td isNumeric>
                          <DeltaMetricCell
                            value={delta?.delta_faithfulness}
                            maxValue={detailDeltaMax}
                          />
                        </Td>
                        <Td isNumeric>
                          <DeltaMetricCell
                            value={delta?.delta_total_tokens}
                            digits={1}
                            maxValue={detailDeltaMax}
                          />
                        </Td>
                        <Td>
                          <EcrBadge value={delta?.ecr} />
                        </Td>
                        <Td>
                          <DirectionPill
                            direction={delta?.ecr_direction_correctness}
                          />
                        </Td>
                        <Td>
                          <EcrBadge value={delta?.ecr_faithfulness} />
                        </Td>
                        <Td>
                          <DirectionPill
                            direction={delta?.ecr_direction_faithfulness}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </ScrollableTable>
          </SectionCard>
        </>
      )}
    </VStack>
  );
}
