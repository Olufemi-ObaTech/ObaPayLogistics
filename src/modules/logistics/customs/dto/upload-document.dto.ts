import { IsEnum, IsString, IsUrl } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadCustomsDocumentDto {
  @IsString()
  shipmentId: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  // In production this would be a multipart file upload streamed to S3/Cloud
  // Storage by a dedicated upload endpoint; the API here accepts the resulting
  // object URL to keep the storage layer swappable.
  @IsUrl({ require_tld: false })
  fileUrl: string;
}
