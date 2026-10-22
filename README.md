# InsightVault AI: AI Research Assistant

## 1. Abstract
InsightVault AI is an intelligent research assistant powered by Retrieval-Augmented Generation (RAG). It enables users to securely upload research documents (PDFs/TXTs) and query them using natural language. The system converts these documents into vector embeddings, performs semantic similarity searches to retrieve highly relevant context, and uses a Large Language Model (LLM) to generate precise answers grounded purely in the provided texts, completely avoiding hallucination.

## 2. Problem Statement
Researchers, students, and professionals often struggle to manually sift through dense research papers and lengthy PDF documents to find specific insights. Keyword searches fall short of understanding context, and relying on traditional LLMs without external grounding often leads to hallucinated or generalized answers that are not backed by specific studies. There is a need for a dedicated tool that accurately retrieves knowledge exclusively from trusted sources provided by the user.

## 3. Objective
To build an AI-powered assistant capable of retrieving accurate insights from uploaded research documents and answering user queries interactively while providing transparency (citations and confidence scores) to ensure the answers are grounded in facts.

## 4. Methodology & Procedure
The system utilizes the **Retrieval-Augmented Generation (RAG)** pipeline:
1. **Data Collection & Upload**: Users upload PDF or TXT documents via the frontend interface.
2. **Preprocessing**: The `backend/utils.py` script parses the documents and splits the text into manageable chunks using a `RecursiveCharacterTextSplitter`.
3. **Embedding**: Text chunks are converted into dense vector representations using `HuggingFaceEmbeddings` (`sentence-transformers/all-MiniLM-L6-v2`).
4. **Vector Database**: Embeddings are stored and indexed in a local FAISS database for blazing-fast semantic similarity search.
5. **Retrieval**: When a query is asked, it is embedded using the same model, and the closest matching chunks are retrieved using L2 distance scoring.
6. **Generation**: The retrieved chunks and the user query are injected into a structured prompt. The Groq LLM (LLaMA 3.1) generates a cohesive answer based *only* on that retrieved context.

## 5. Technologies Used
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (for modern UI), FontAwesome
- **Backend Framework**: Python, FastAPI, Uvicorn
- **AI / NLP Pipeline**: LangChain, PyPDF
- **LLM Engine**: Groq Cloud (LLaMA 3.1 8B)
- **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Vector Database**: FAISS (Facebook AI Similarity Search)
- **Containerization**: Docker
- **Cloud Infrastructure**: AWS (Planned)

## 6. Implementation Data & File Structure

The project is structured into frontend and backend components, alongside documentation and deployment configurations:

*   **`backend/`**: Contains the core logic and the FastAPI server.
    *   `main.py`: Main FastAPI application. Handles API requests (`/upload`, `/query`, `/sources`), initializes the RAG retriever, and mounts the frontend static files.
    *   `rag_pipeline.py`: Defines the LangChain pipeline. It handles connecting to the Groq API using `ChatGroq`, constructs the prompt template, and generates the final answer based on retrieved context.
    *   `retriever.py`: Manages the FAISS vector database. It includes the `FAISSRetriever` class which is responsible for embedding text chunks and performing similarity searches.
    *   `utils.py`: Contains utility functions for data processing, specifically `load_and_chunk_file`, which reads PDFs/text files and splits them into LangChain Document chunks.
    *   `requirements.txt`: Lists all Python dependencies required for the backend.
*   **`frontend/`**: Contains the user interface.
    *   `index.html`: A responsive, dynamic single-page application featuring chat interfaces, upload modals, and context viewers.
    *   `app.js`: The core JavaScript logic that handles API calls to the backend, manages UI state, and dynamically updates the chat window.
    *   `styles.css`: Custom CSS styles that supplement Tailwind CSS for specific animations and layouts.
*   **`data/`**: Storage directory for user uploads.
    *   `research_papers/`: Directory where uploaded PDF and TXT files are temporarily stored before processing.
*   **`vector_db/`**: Storage directory for the FAISS database.
    *   `faiss_langchain/`: Contains the serialized FAISS index files (`index.faiss` and `index.pkl`) storing the document embeddings.
*   **`Dockerfile`**: Defines the Docker image build process. It sets up a Python 3.11 environment, installs system and Python dependencies, and specifies the startup command for the Uvicorn server.
*   **`start.bat`**: A Windows batch script for convenient local startup of the application without Docker.

## 7. Deployment Strategy (Docker & AWS)

While the application can run locally, it is designed to be easily deployable to cloud environments using modern DevOps practices.

### 🐳 Docker Containerization
Docker is used to package the entire application (backend, frontend, and dependencies) into a single, standardized unit called a container. 
**What we are doing:**
- By running `docker build`, we create an isolated Linux environment (Python 3.11-slim) containing our app. This ensures the app runs exactly the same on any machine, eliminating "it works on my machine" issues.
- The `Dockerfile` handles installing all complex AI dependencies like PyTorch, FAISS, and LangChain automatically.
- Running `docker run` starts the container and binds port 8000, exposing the FastAPI server and frontend to your host machine.

### ☁️ AWS Cloud Deployment
To make InsightVault AI accessible globally, we plan to deploy it using Amazon Web Services (AWS).
**What we are going to do:**
1. **Amazon EC2 (Elastic Compute Cloud)**: We will provision a virtual server on AWS to run our Docker container continuously. This allows users to access the AI assistant 24/7 without needing to run it on their personal computers.
2. **Amazon S3 (Simple Storage Service)**: Instead of storing uploaded PDFs in the local `data/` folder, we will migrate file storage to S3 buckets for scalable, durable storage.
3. **AWS AppRunner or ECS**: For a more automated deployment, we can push our Docker image to Amazon ECR (Elastic Container Registry) and deploy it via AppRunner, which automatically scales the application based on user traffic.

---

## 🚀 How to Run

### Option 1: Running with Docker (Recommended)
1. Build the Docker image:
   ```bash
   docker build -t insightvault-ai .
   ```
2. Run the container:
   ```bash
   docker run -p 8000:8000 insightvault-ai
   ```
3. Open your browser and navigate to: **http://localhost:8000** *(Do not use 0.0.0.0 in the browser)*.

### Option 2: Running Locally (Windows)
1. Double-click the `start.bat` file in the project root. This will automatically start the FastAPI server.
2. Navigate to **http://localhost:8000** in your browser.
