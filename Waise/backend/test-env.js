// test-env.js
require('dotenv').config();
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY);
console.log('PINECONE_ENVIRONMENT:', process.env.PINECONE_ENVIRONMENT);
console.log('PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME);