# Initial Concept

## Target Audience
- Researchers and Analysts needing deep document insights.
- General users seeking answers from a knowledge base.

## Product Goals
- Enhancing information retrieval accuracy using multimodal data (text, images, etc.).
- Visualizing complex relationships between data points via knowledge graphs.
- Streamlining the research process by aggregating and synthesizing information from multiple sources.

## Key Features

### 1. PDF Service (pdfserviceMD)
- **Hybrid OCR:** Switches between Local Marker (free) and Datalab API (cloud) for cost-efficiency.
- **Context-Aware Translation:** Translates documents chunk-by-chunk while preserving pagination and layout.
- **PDF Regeneration:** Reconstructs the translated document as a new PDF.

### 2. RAG Database
- **Hybrid Search:** Combines FAISS (vector) and BM25 (keyword) for precise retrieval.
- **Deep Research Agent:** Decomposes complex questions into a "Plan-and-Solve" workflow.
- **Advanced RAG:** Implements HyDE, Multi-Query expansion, and Cross-Encoder reranking.

### 3. Image Service
- **In-Place Translation:** Detects text in images, translates it, and overlays it directly onto the original image.
- **Smart Resizing:** Optimizes large images for OCR processing.

### 4. Multimodal RAG
- **Visual Extraction:** identifying and cropping figures/charts from PDFs using layout analysis.
- **Image Summarization:** Uses Gemini Vision to generate context-aware descriptions for indexed images.
- **Visual Verification:** Allows agents to "re-examine" images to answer specific user questions.

### 5. Graph RAG
- **Knowledge Graph:** Extracts entities and relationships (e.g., "uses", "outperforms") from documents.
- **Global Search:** Uses community detection (Leiden) to answer high-level summary questions across the entire dataset.
- **Interactive Visualization:** Provides force-directed graph exploration.

### 6. User Statistics
- **Analytics Dashboard:** Tracks usage, accuracy rates (Self-RAG evaluation), and confidence scores.
- **Trend Analysis:** Visualizes 7-day query volume and most cited documents.

### 7. Conversations
- **History Management:** Persistent storage for standard chat and deep research sessions.
- **Context Restoration:** Seamlessly resumes dialogue state across logins.

## Technical Constraints & Requirements
- Real-time updates for chat and graph visualizations.
- Scalable vector storage for handling large document sets.
- High accuracy in RAG responses and graph construction.

## Design & UX Principles
- Professional Data Command Center aesthetic with full glassmorphism (blur, translucency).
- Immersive visualizations: Interactive Tree for Deep Research progress and responsive Knowledge Graph.
- Streamlined "Integrated Input" for seamless mode switching between Chat and Research.
