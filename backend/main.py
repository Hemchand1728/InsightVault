import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.utils import load_and_chunk_file
from backend.retriever import FAISSRetriever
from backend.rag_pipeline import generate_answer

app = FastAPI(title="InsightVault AI API", version="1.0")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Retriever
base_dir = os.path.dirname(os.path.abspath(__file__))
db_dir = os.path.join(base_dir, "..", "vector_db")
retriever = FAISSRetriever(db_path=db_dir)

class QueryRequest(BaseModel):
    query: str

@app.post("/upload")
async def upload_document(files: list[UploadFile] = File(...)):
    """Uploads documents, extracts text, chunks it, and stores embeddings in FAISS."""
    research_dir = os.path.join(base_dir, "..", "data", "research_papers")
    os.makedirs(research_dir, exist_ok=True)
    
    total_chunks = 0
    processed_files = []
    
    for file in files:
        if not (file.filename.endswith(".pdf") or file.filename.endswith(".txt")):
            continue
            
        temp_path = os.path.join(research_dir, file.filename)
        
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        try:
            # Extract and chunk
            chunks = load_and_chunk_file(temp_path, file.filename)
            if not chunks:
                continue
                
            # Add to vector DB
            retriever.add_chunks(chunks)
            total_chunks += len(chunks)
            processed_files.append(file.filename)
            
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            
    if not processed_files:
        raise HTTPException(status_code=400, detail="No valid files were uploaded or processed successfully.")
        
    return {"message": f"Successfully processed {len(processed_files)} file(s). Added {total_chunks} chunks to the database."}

@app.post("/query")
async def query_assistant(request: QueryRequest):
    """Takes a query, retrieves context, and generates an answer."""
    query = request.query
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        # Retrieve context
        retrieved_chunks = retriever.search(query, k=5)
        
        # Generate answer
        result = generate_answer(query, retrieved_chunks)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sources")
async def get_sources():
    """Returns a list of all documents stored in the knowledge base."""
    sources = retriever.get_sources()
    return {"sources": sources}

@app.delete("/sources/{filename}")
async def delete_source(filename: str):
    """Deletes a document from the FAISS database and local storage."""
    # 1. Delete from FAISS
    deleted_count = retriever.delete_source(filename)
    
    # 2. Delete physical file
    research_dir = os.path.join(base_dir, "..", "data", "research_papers")
    file_path = os.path.join(research_dir, filename)
    
    file_deleted = False
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            file_deleted = True
        except Exception as e:
            print(f"Failed to delete physical file {filename}: {e}")
            
    if deleted_count == 0 and not file_deleted:
        raise HTTPException(status_code=404, detail="File not found in knowledge base or storage.")
        
    return {"message": f"Successfully deleted {filename} ({deleted_count} chunks removed)."}

from fastapi.staticfiles import StaticFiles
frontend_dir = os.path.join(base_dir, "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Make sure to run this from the backend folder using: uvicorn main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
