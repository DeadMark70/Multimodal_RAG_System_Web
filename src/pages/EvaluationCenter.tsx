import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import TestCaseManager from '../components/evaluation/TestCaseManager';
import ModelConfigPanel from '../components/evaluation/ModelConfigPanel';
import CampaignRunner from '../components/evaluation/CampaignRunner';
import EvaluationResults from '../components/evaluation/EvaluationResults';

export default function EvaluationCenter() {
  return (
    <Layout>
      <PageHeader title="評估中心" subtitle="題庫管理與模型參數設定" variant="dashboard" />

      <Tabs variant="enclosed-colored">
        <TabList>
          <Tab>題庫管理</Tab>
          <Tab>模型設定</Tab>
          <Tab>評估活動</Tab>
          <Tab>結果分析</Tab>
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
        </TabPanels>
      </Tabs>
    </Layout>
  );
}
