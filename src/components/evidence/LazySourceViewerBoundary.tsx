import {
  Alert,
  AlertIcon,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

import type { SourceEvidence } from '../../types/evidence';
import { loadSourceViewerModule } from './sourceViewerLoader';

export interface LazySourceViewerBoundaryProps {
  evidence: SourceEvidence;
  onClose: () => void;
}

interface ViewerModuleErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ViewerModuleErrorBoundaryState {
  hasError: boolean;
}

class ViewerModuleErrorBoundary extends Component<
  ViewerModuleErrorBoundaryProps,
  ViewerModuleErrorBoundaryState
> {
  state: ViewerModuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ViewerModuleErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function LoadingFallback({ onClose }: Pick<LazySourceViewerBoundaryProps, 'onClose'>) {
  return (
    <Modal isOpen onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>正在載入 PDF 檢視器</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack minH="240px" align="center" justify="center" spacing={4}>
            <Spinner />
            <Text>正在準備來源文件預覽…</Text>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

interface LazyViewerControllerState {
  attempt: number;
  LazySourceViewer: LazyExoticComponent<ComponentType<LazySourceViewerBoundaryProps>>;
}

function createLazySourceViewer() {
  return lazy(loadSourceViewerModule);
}

class LazyViewerController extends Component<
  LazySourceViewerBoundaryProps,
  LazyViewerControllerState
> {
  state: LazyViewerControllerState = {
    attempt: 0,
    LazySourceViewer: createLazySourceViewer(),
  };

  private readonly retry = () => {
    this.setState(({ attempt }) => ({
      attempt: attempt + 1,
      LazySourceViewer: createLazySourceViewer(),
    }));
  };

  render() {
    const { evidence, onClose } = this.props;
    const { attempt, LazySourceViewer } = this.state;
    const failureFallback = (
      <Modal isOpen onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{evidence.filename ?? '來源文件'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4} align="start">
              <Alert status="error">
                <AlertIcon />
                PDF 檢視器載入失敗
              </Alert>
              <Button onClick={this.retry}>再試一次</Button>
              <Button variant="outline" onClick={onClose}>關閉</Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );

    return (
      <ViewerModuleErrorBoundary key={attempt} fallback={failureFallback}>
        <Suspense fallback={<LoadingFallback onClose={onClose} />}>
          <LazySourceViewer evidence={evidence} onClose={onClose} />
        </Suspense>
      </ViewerModuleErrorBoundary>
    );
  }
}

export function LazySourceViewerBoundary(props: LazySourceViewerBoundaryProps) {
  return <LazyViewerController {...props} />;
}
