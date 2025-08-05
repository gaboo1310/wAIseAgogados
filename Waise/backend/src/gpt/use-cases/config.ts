// config.ts
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || (() => {
  throw new Error('OPENAI_API_KEY is required');
})();

export const PINECONE_API_KEY = process.env.PINECONE_API_KEY || (() => {
  throw new Error('PINECONE_API_KEY is required');
})();

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || (() => {
  throw new Error('PINECONE_INDEX_NAME is required');
})();

//export const PINECONE_ENVIRONMENT = 'us-east-1-aws';
