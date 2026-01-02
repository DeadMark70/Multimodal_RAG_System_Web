export const MOCK_DOCUMENTS = [
    {
        id: '1',
        filename: 'Attention Is All You Need.pdf',
        created_at: '2023-12-01T10:00:00Z',
        status: 'indexed',
        processing_step: 'complete'
    },
    {
        id: '2',
        filename: 'BERT Pre-training of Deep Bidirectional Transformers.pdf',
        created_at: '2023-12-02T14:30:00Z',
        status: 'processing',
        processing_step: 'generating_pdf'
    },
     {
        id: '3',
        filename: 'GPT-4 Technical Report.pdf',
        created_at: '2023-12-05T09:15:00Z',
        status: 'failed',
        processing_step: 'ocr'
    }
];

import type { ChatMessage } from '../types/rag';

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
    {
        id: '1',
        role: 'user',
        content: 'What is the main contribution of the "Attention Is All You Need" paper?',
        timestamp: 1702980000000
    },
    {
        id: '2',
        role: 'assistant',
        content: 'The main contribution is the **Transformer model**, which relies entirely on self-attention mechanisms, dispensing with recurrence and convolutions entirely [1]. It achieves state-of-the-art results on translation tasks while being more parallelizable.',
        sources: [
            {
                doc_id: '1',
                filename: 'Attention Is All You Need.pdf',
                page: 1,
                snippet: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
                score: 0.98
            }
        ],
        metrics: {
            faithfulness: 'grounded',
            confidence_score: 0.98
        },
        timestamp: 1702980005000
    },
    {
        id: '3',
        role: 'user',
        content: 'Does it mention anything about RNNs?',
        timestamp: 1702980010000
    },
    {
        id: '4',
        role: 'assistant',
        content: 'Yes, it discusses how RNNs are difficult to parallelize because of their sequential nature [1]. The Transformer solves this by processing sequences in parallel.',
        sources: [
            {
                doc_id: '1',
                filename: 'Attention Is All You Need.pdf',
                page: 2,
                snippet: 'This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths.',
                score: 0.95
            }
        ],
         metrics: {
            faithfulness: 'grounded',
            confidence_score: 0.95
        },
        timestamp: 1702980015000
    }
];
