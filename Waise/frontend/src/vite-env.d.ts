/// <reference types="vite/client" />


interface ImportMetaEnv {
    readonly VITE_GPT_API: string; // Agrega aquí otras variables de entorno si las tienes
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  