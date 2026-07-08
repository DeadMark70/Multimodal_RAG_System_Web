import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import TestCaseManager from './TestCaseManager';
import ModelConfigPanel from './ModelConfigPanel';
import CampaignRunner from './CampaignRunner';

interface EvaluationSetupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EvaluationSetupDrawer({ isOpen, onClose }: EvaluationSetupDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="xl" placement="right">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Evaluation Setup</DrawerHeader>
        <DrawerBody>
          <Tabs variant="enclosed">
            <TabList overflowX="auto" overflowY="hidden">
              <Tab>Test Cases</Tab>
              <Tab>Model Configs</Tab>
              <Tab>Campaigns</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <TestCaseManager />
              </TabPanel>
              <TabPanel px={0}>
                <ModelConfigPanel />
              </TabPanel>
              <TabPanel px={0}>
                <CampaignRunner />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
