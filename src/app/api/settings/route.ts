import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    let settings = await db.storeSetting.findFirst();

    if (!settings) {
      settings = await db.storeSetting.create({
        data: {},
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Hanya admin yang dapat mengubah pengaturan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      storeName, address, phone, email, taxEnabled, taxPercent, currency, receiptFooter,
      receiptPaperWidth, receiptFontSize, receiptCharPerLine, receiptLineSpacing, receiptMargin,
      receiptShowLogo, receiptShowAddress, receiptShowPhone, receiptShowEmail,
      receiptShowTax, receiptShowPayment, receiptShowQrCode, receiptShowItems, receiptDuplicate,
    } = body;

    let settings = await db.storeSetting.findFirst();

    if (!settings) {
      settings = await db.storeSetting.create({
        data: {
          storeName, address, phone, email, taxEnabled, taxPercent, currency, receiptFooter,
          receiptPaperWidth, receiptFontSize, receiptCharPerLine, receiptLineSpacing, receiptMargin,
          receiptShowLogo, receiptShowAddress, receiptShowPhone, receiptShowEmail,
          receiptShowTax, receiptShowPayment, receiptShowQrCode, receiptShowItems, receiptDuplicate,
        },
      });
    } else {
      settings = await db.storeSetting.update({
        where: { id: settings.id },
        data: {
          ...(storeName !== undefined && { storeName }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(taxEnabled !== undefined && { taxEnabled }),
          ...(taxPercent !== undefined && { taxPercent }),
          ...(currency !== undefined && { currency }),
          ...(receiptFooter !== undefined && { receiptFooter }),
          ...(receiptPaperWidth !== undefined && { receiptPaperWidth }),
          ...(receiptFontSize !== undefined && { receiptFontSize }),
          ...(receiptCharPerLine !== undefined && { receiptCharPerLine }),
          ...(receiptLineSpacing !== undefined && { receiptLineSpacing }),
          ...(receiptMargin !== undefined && { receiptMargin }),
          ...(receiptShowLogo !== undefined && { receiptShowLogo }),
          ...(receiptShowAddress !== undefined && { receiptShowAddress }),
          ...(receiptShowPhone !== undefined && { receiptShowPhone }),
          ...(receiptShowEmail !== undefined && { receiptShowEmail }),
          ...(receiptShowTax !== undefined && { receiptShowTax }),
          ...(receiptShowPayment !== undefined && { receiptShowPayment }),
          ...(receiptShowQrCode !== undefined && { receiptShowQrCode }),
          ...(receiptShowItems !== undefined && { receiptShowItems }),
          ...(receiptDuplicate !== undefined && { receiptDuplicate }),
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
