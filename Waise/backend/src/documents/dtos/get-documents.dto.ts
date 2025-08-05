export class DocumentMetadata {
  id: string;
  title: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  size: number;
}

export class GetDocumentsDto {
  documents: DocumentMetadata[];
  totalCount: number;
}