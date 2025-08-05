// types.ts
export interface Options {
  prompt: string;
  minScoreThreshold?: number;
  useWebSearch?: boolean;
  messageHistory?: Array<{ role: string, content: string }>;
  conversationId?: string;
  selectedLibraries?: string[];
  focus?: string;
}
  
export interface ProjectInfo {
  id: string;
  text: string;
  title: string;
  projectDate: string;
  url: string;
  score: number;
  tipo?: string;
}
  
export interface GroupedResult {
  matches: any[];
  maxScore: number;
  title: string;
  date: string;
  url: string;
  tipo: string;
}
  
export interface ExtractedDataItem {
  rawMatch: string;
  captureGroups: string[];
  context: string;
}
  
export interface ProjectDataWithExtraction {
  title: string;
  url: string;
  date: string;
  score: number;
  extractedData: ExtractedDataItem[];
}
  
export interface ConversationCache {
  originalQuery: string;
  searchResults: {
    structuredProjects: ProjectInfo[];
    proyectos: any[];
    noticias: any[];
    specificData: any[];
    proyectosReconstruidos: any[];
  };
  lastAccessed: Date;
}