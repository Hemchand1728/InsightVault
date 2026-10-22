import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

# Load environment variables from the .env file
load_dotenv()

# PASTE YOUR GROQ API KEY HERE IF YOU WANT TO HARDCODE IT (Not Recommended for GitHub):
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "your-groq-api-key-here")

if GROQ_API_KEY and GROQ_API_KEY != "your-groq-api-key-here":
    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        api_key=GROQ_API_KEY
    )
else:
    llm = None

def generate_answer(query: str, retrieved_chunks: list[dict]) -> dict:
    """Generates an answer using Groq Llama 3 based on retrieved context."""
    if not retrieved_chunks:
        return {
            "answer": "I don't have enough context in my database to answer this question. Please upload relevant research papers.",
            "sources": [],
            "confidence": 0.0
        }
    
    # Build context string
    sources = []
    for chunk in retrieved_chunks:
        if chunk["source"] not in sources:
            sources.append(chunk["source"])

    context = "\n\n".join([chunk['text'] for chunk in retrieved_chunks])
    
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
        You are a helpful Research Assistant named InsightVault AI.
        Answer the user's question based ONLY on the provided research context below.
        If the answer is not contained in the context, say "I cannot find the answer in the provided research documents." Do not hallucinate.
        
        Question: {question}
        context: {context}
        """,
    )
    
    if llm:
        try:
            final_prompt = prompt.format(context=context, question=query)
            result = llm.invoke(final_prompt)
            answer = result.content
        except Exception as e:
            answer = f"Error calling Groq API: {e}"
    else:
        answer = "Error: GROQ_API_KEY is not set. Please provide a valid Groq API key in rag_pipeline.py or environment variables."

    # Mock confidence score calculation based on FAISS distances
    avg_distance = sum(chunk['distance'] for chunk in retrieved_chunks) / len(retrieved_chunks)
    confidence = max(0.5, 0.99 - (avg_distance * 0.1)) 
    
    return {
        "answer": answer.strip(),
        "sources": sources,
        "confidence": round(confidence * 100, 1),
        "chunks_used": retrieved_chunks
    }
