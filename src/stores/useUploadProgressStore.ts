import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  ACTIVE_BATCH_UPLOAD_STATUSES,
  type BatchUploadItem,
} from '../features/uploads/uploadProgress';

interface UploadProgressStoreState {
  uploads: BatchUploadItem[];
  isUploading: boolean;
  actions: {
    setUploads: (uploads: BatchUploadItem[]) => void;
    updateUpload: (id: string, patch: Partial<BatchUploadItem>) => void;
    reset: () => void;
  };
}

const EMPTY_UPLOAD_PROGRESS_STATE = {
  uploads: [] as BatchUploadItem[],
  isUploading: false,
};

function deriveIsUploading(uploads: BatchUploadItem[]): boolean {
  return uploads.some((upload) => ACTIVE_BATCH_UPLOAD_STATUSES.has(upload.status));
}

export const useUploadProgressStore = create<UploadProgressStoreState>()(
  subscribeWithSelector((set) => ({
    ...EMPTY_UPLOAD_PROGRESS_STATE,
    actions: {
      setUploads: (uploads) =>
        set({
          uploads,
          isUploading: deriveIsUploading(uploads),
        }),
      updateUpload: (id, patch) =>
        set((state) => {
          const uploads = state.uploads.map((upload) =>
            upload.id === id ? { ...upload, ...patch } : upload
          );
          return {
            uploads,
            isUploading: deriveIsUploading(uploads),
          };
        }),
      reset: () => set(EMPTY_UPLOAD_PROGRESS_STATE),
    },
  }))
);

export const useBatchUploads = () => useUploadProgressStore((state) => state.uploads);

export const useIsBatchUploading = () => useUploadProgressStore((state) => state.isUploading);

export const useUploadProgressActions = () =>
  useUploadProgressStore((state) => state.actions);

export function resetUploadProgressStore(): void {
  useUploadProgressStore.setState(EMPTY_UPLOAD_PROGRESS_STATE);
}
