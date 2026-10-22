import os
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

class FAISSRetriever:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vector_db")
        self.db_path = db_path
        os.makedirs(self.db_path, exist_ok=True)
        
        self.index_path = os.path.join(self.db_path, "faiss_langchain")
        
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        self.vector_db = None
        if os.path.exists(self.index_path) and os.path.exists(os.path.join(self.index_path, "index.faiss")):
            self.vector_db = FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)
            print("Loaded existing Langchain FAISS index.")
        else:
            print("No existing FAISS index found. It will be created upon first upload.")

    def add_chunks(self, chunks):
        """Adds Langchain Document chunks to the FAISS index."""
        if not chunks:
            return

        if self.vector_db is None:
            self.vector_db = FAISS.from_documents(chunks, self.embeddings)
            print("|FAISS VECTOR STORE CREATED FROM DOCUMENTS>")
        else:
            self.vector_db.add_documents(chunks)
        
        self.vector_db.save_local(self.index_path)
        print("FAISS index saved.")

    def search(self, query: str, k: int = 3) -> list[dict]:
        """Searches the index for the most similar chunks to the query."""
        if self.vector_db is None:
            return []
            
        results = self.vector_db.similarity_search_with_score(query, k=k)
        
        formatted_results = []
        for doc, score in results:
            formatted_results.append({
                "text": doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "distance": float(score)
            })
            
        return formatted_results

    def get_sources(self):
        """Returns a list of unique source filenames."""
        if self.vector_db is None:
            return []
        
        sources = set()
        for doc_id, doc in self.vector_db.docstore._dict.items():
            source = doc.metadata.get("source")
            if source:
                sources.add(source)
        return list(sources)

    def delete_source(self, filename: str) -> int:
        """Deletes all chunks associated with a specific filename."""
        if self.vector_db is None:
            return 0
            
        ids_to_delete = []
        for doc_id, doc in self.vector_db.docstore._dict.items():
            if doc.metadata.get("source") == filename:
                ids_to_delete.append(doc_id)
                
        if ids_to_delete:
            self.vector_db.delete(ids_to_delete)
            self.vector_db.save_local(self.index_path)
            print(f"Deleted {len(ids_to_delete)} chunks for source: {filename}")
            
        return len(ids_to_delete)
