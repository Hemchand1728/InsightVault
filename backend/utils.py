import os
import uuid
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_and_chunk_file(file_path: str, filename: str):
    """Loads a PDF and splits it into chunks using Langchain."""
    if filename.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
        documents = loader.load()
    elif filename.endswith(".txt"):
        # For txt support, since original app supported txt
        from langchain_community.document_loaders import TextLoader
        loader = TextLoader(file_path, encoding='utf-8')
        documents = loader.load()
    else:
        return []

    # Update metadata to ensure source is just the filename for cleaner UI
    for doc in documents:
        doc.metadata["source"] = filename

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )
    
    chunks = text_splitter.split_documents(documents)
    return chunks
