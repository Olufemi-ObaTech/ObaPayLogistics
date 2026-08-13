import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, DocumentVerificationStatus, ShipmentStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UploadCustomsDocumentDto } from './dto/upload-document.dto';

// Simplified Harmonized System (HS) code lookup by declared customs category.
// Real integration would call a tariff classification service per-item; this
// MVP-level mapping is enough to pre-populate a plausible customs declaration.
const HS_CODE_BY_CATEGORY: Record<string, string> = {
  DOCUMENTS: '4901.99',
  GIFTS: '9804.00',
  COMMERCIAL_SAMPLE: '9811.00',
  PERSONAL_EFFECTS: '9805.00',
  ELECTRONICS: '8517.62',
  MERCHANDISE: '6109.10',
  OTHER: '9999.99',
};

@Injectable()
export class CustomsService {
  private readonly logger = new Logger(CustomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async uploadDocument(userId: string, dto: UploadCustomsDocumentDto) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: dto.shipmentId } });
    if (!shipment || shipment.userId !== userId) throw new NotFoundException('Shipment not found');

    // Only accept object URLs from our own trusted storage bucket/CDN — a
    // client-supplied arbitrary URL here would let an attacker point the
    // platform at an internal/private address (SSRF) or serve unmoderated
    // content under ObaPay's domain when the PDF/portal later renders it.
    const trustedPrefix = this.config.get<string>('DOCUMENT_STORAGE_BASE_URL', 'https://storage.obapay.com/');
    if (!dto.fileUrl.startsWith(trustedPrefix)) {
      throw new BadRequestException('fileUrl must point to ObaPay-managed document storage');
    }

    // Identity documents are the highest-fraud-risk artifact (they underpin
    // KYC Tier 2/3 upgrades and customs broker eligibility) — auto-verifying
    // them would let anyone unlock higher limits with a fabricated file.
    // Route those to manual/automated review; lower-risk shipment paperwork
    // (invoice, packing list, certificate of origin) stays auto-verified for MVP speed.
    const requiresManualReview = dto.documentType === DocumentType.ID_DOCUMENT;

    const document = await this.prisma.customsDocument.create({
      data: {
        shipmentId: dto.shipmentId,
        documentType: dto.documentType,
        fileUrl: dto.fileUrl,
        verificationStatus: requiresManualReview
          ? DocumentVerificationStatus.PENDING
          : DocumentVerificationStatus.VERIFIED,
        verifiedAt: requiresManualReview ? null : new Date(),
      },
    });

    this.logger.log({ msg: 'customs_document_uploaded', shipmentId: dto.shipmentId, documentType: dto.documentType });
    return document;
  }

  /** GET /customs/status/:shipmentId — simulated clearance progress. */
  async getStatus(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { customsDocuments: true },
    });
    if (!shipment || shipment.userId !== userId) throw new NotFoundException('Shipment not found');

    const requiredDocs = ['INVOICE', 'PACKING_LIST'];
    const uploadedTypes = new Set(shipment.customsDocuments.map((d) => d.documentType));
    const missingDocuments = requiredDocs.filter((d) => !uploadedTypes.has(d as any));

    return {
      shipmentId,
      status: shipment.status,
      isClearanceStage: shipment.status === ShipmentStatus.CUSTOMS_CLEARANCE,
      isCleared: shipment.status === ShipmentStatus.DELIVERED,
      documents: shipment.customsDocuments,
      missingDocuments,
      readyForPreClearance: missingDocuments.length === 0,
    };
  }

  /**
   * Generates a pre-filled customs declaration PDF (invoice + packing list +
   * HS codes + declared value) ready for electronic submission to a national
   * single-window portal. Returns the raw PDF buffer; controller streams it.
   */
  async generateCustomsForm(shipmentId: string, userId: string): Promise<Buffer> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { user: true, customsDocuments: true },
    });
    if (!shipment || shipment.userId !== userId) throw new NotFoundException('Shipment not found');
    if (!shipment.trackingNumber) {
      throw new BadRequestException('Shipment must be paid and assigned a tracking number before generating customs forms');
    }

    const hsCode = HS_CODE_BY_CATEGORY[shipment.customsCategory] ?? HS_CODE_BY_CATEGORY.OTHER;
    const origin = shipment.originAddress as any;
    const destination = shipment.destinationAddress as any;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('ObaPay Logistics — Customs Declaration', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Tracking Number: ${shipment.trackingNumber}`);
      doc.text(`Declaration Date: ${new Date().toISOString().slice(0, 10)}`);
      doc.moveDown();

      doc.fontSize(12).text('Shipper', { underline: true });
      doc.fontSize(10).text(`${shipment.user.firstName} ${shipment.user.lastName}`);
      doc.text(`${origin.line1}, ${origin.city}, ${origin.country}`);
      doc.moveDown();

      doc.fontSize(12).text('Consignee', { underline: true });
      doc.fontSize(10).text(`${destination.line1}, ${destination.city}, ${destination.country}`);
      doc.moveDown();

      doc.fontSize(12).text('Item Declaration', { underline: true });
      doc.fontSize(10);
      doc.text(`Customs Category: ${shipment.customsCategory}`);
      doc.text(`Harmonized System (HS) Code: ${hsCode}`);
      doc.text(`Declared Value: ${shipment.declaredValue} ${shipment.declaredValueCurrency}`);
      doc.text(`Weight: ${shipment.weightKg} kg`);
      const dims = shipment.dimensionsCm as any;
      doc.text(`Dimensions: ${dims.length} x ${dims.width} x ${dims.height} cm`);
      doc.text(`Shipping Method: ${shipment.shippingMethod}`);
      doc.moveDown();

      doc.fontSize(12).text('Supporting Documents', { underline: true });
      doc.fontSize(10);
      if (shipment.customsDocuments.length === 0) {
        doc.text('None uploaded yet.');
      } else {
        shipment.customsDocuments.forEach((d) => doc.text(`- ${d.documentType}: ${d.verificationStatus}`));
      }
      doc.moveDown();

      doc.fontSize(9).fillColor('gray').text(
        'This declaration is generated for pre-clearance purposes under the AfCFTA simplified trade regime. ' +
          'Final clearance is subject to destination-country customs authority review via their electronic single-window system.',
        { align: 'left' },
      );

      doc.end();
    });
  }
}
