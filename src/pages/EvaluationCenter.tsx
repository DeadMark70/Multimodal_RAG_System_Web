import { Box, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import TestCaseManager from '../components/evaluation/TestCaseManager';
import ModelConfigPanel from '../components/evaluation/ModelConfigPanel';
import CampaignRunner from '../components/evaluation/CampaignRunner';
import EvaluationResults from '../components/evaluation/EvaluationResults';
import AgentTraceViewer from '../components/evaluation/AgentTraceViewer';

export default function EvaluationCenter() {
  return (
    <Layout>
      <Flex direction="column" flex={1} minH={0} overflow="hidden">
        <Box flexShrink={0}>
          <PageHeader title="評估中心" subtitle="題庫管理與模型參數設定" variant="dashboard" />
        </Box>

        <Box
          flex={1}
          minH={0}
          overflowY="auto"
          pr={{ base: 1, md: 2 }}
          pb={2}
          data-testid="evaluation-scroll-region"
        >
          <Tabs variant="enclosed-colored">
            <TabList>
              <Tab>題庫管理</Tab>
              <Tab>模型設定</Tab>
              <Tab>評估活動</Tab>
              <Tab>結果分析</Tab>
              <Tab>Agent Trace</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} pt={4}>
                <TestCaseManager />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <ModelConfigPanel />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <CampaignRunner />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <EvaluationResults />
              </TabPanel>
              <TabPanel px={0} pt={4}>
                <AgentTraceViewer />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </Layout>
  );
}
