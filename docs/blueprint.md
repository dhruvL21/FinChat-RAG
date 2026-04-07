# **App Name**: FinChat AI

## Core Features:

- Secure Document Upload: Users can upload CSV bank statements and PDF financial documents (insurance, tax docs) securely.
- Intelligent Data Processing & Indexing: Parses and cleans uploaded CSV and PDF files, chunks the text (500-1000 tokens), generates local embeddings using Ollama's 'nomic-embed-text' model, and stores chunks, embeddings, and metadata (date, category, amount, filename) in a local ChromaDB vector store.
- Conversational AI Assistant: Provides an intuitive chat interface for users to ask natural language questions about their uploaded financial data.
- AI-Powered Financial Insights: Acts as a reasoning tool, utilizing OpenAI's 4.0 mini GPT model to retrieve relevant information from ChromaDB and generate natural language answers to user queries, such as expense summaries or explanations of insurance coverage.
- Contextual Source Attribution: Displays the top 5 most relevant document chunks (sources) alongside AI-generated answers for transparency and verification.
- Automated Expense Categorization Tool: An AI-powered tool that automatically assigns predefined categories (e.g., food, rent, travel) to uploaded transaction data for better financial analysis.

## Style Guidelines:

- Primary color: A deep, trustworthy blue (#234EA8), chosen to evoke reliability and clarity, setting a stable foundation for financial interactions. 
- Background color: A subtle, desaturated cool grey (#EAF0F6), visibly derived from the primary blue, offering a clean and calm canvas that enhances readability.
- Accent color: A rich, energetic violet (#6D3DDE), analogous to the primary, used to draw attention to interactive elements and highlight key information.
- Body and headline font: 'Inter' (sans-serif) for its modern, neutral, and highly readable characteristics, ensuring clarity across both conversational text and financial data displays.
- Use clear, concise iconography related to finance, documents, chat interactions, and data visualization (e.g., charts, magnifying glass) to intuitively guide users.
- A clean, organized, and responsive layout that prioritizes content legibility, with distinct sections for document upload, chat interface, and information display.
- Incorporate subtle and functional animations for user feedback during file uploads, data processing, and when AI responses are being generated, enhancing perceived responsiveness.