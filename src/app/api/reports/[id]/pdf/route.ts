import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clearvinReportById } from '@/lib/clearvin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const reports = await prisma.$queryRawUnsafe(
      `SELECT processed_data, vin FROM reports WHERE id = $1 AND user_id = $2 LIMIT 1`,
      id, session.user.id
    ) as Array<{ processed_data: { clearvin_report_id?: string }; vin: string }>;

    const report = reports[0];
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const clearvinReportId = report.processed_data?.clearvin_report_id;
    if (!clearvinReportId) return NextResponse.json({ error: 'PDF not available' }, { status: 404 });

    const pdfBuffer = await clearvinReportById(clearvinReportId, 'pdf') as ArrayBuffer;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carhaki-report-${report.vin}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 });
  }
}
