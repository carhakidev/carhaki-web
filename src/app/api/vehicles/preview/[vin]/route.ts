import { NextRequest, NextResponse } from 'next/server';

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

interface NhtsaVariable {
  Variable: string;
  Value: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params;
  const upperVin = vin?.toUpperCase();

  if (!upperVin || upperVin.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/.test(upperVin)) {
    return NextResponse.json({ error: 'Invalid VIN format.' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${NHTSA_BASE}/DecodeVinValues/${upperVin}?format=json`,
      { next: { revalidate: 3600 } } // Cache 1 hour
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch vehicle data.' }, { status: 502 });
    }

    const data = await res.json();
    const result = data.Results?.[0];

    if (!result || !result.Make) {
      return NextResponse.json({ error: 'Vehicle not found for this VIN.' }, { status: 404 });
    }

    // Also fetch recalls
    let recalls: NhtsaVariable[] = [];
    try {
      const recallRes = await fetch(
        `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${result.Make}&model=${result.Model}&modelYear=${result.ModelYear}`,
        { next: { revalidate: 3600 } }
      );
      if (recallRes.ok) {
        const recallData = await recallRes.json();
        recalls = recallData.results || [];
      }
    } catch {
      // Non-fatal — recalls optional
    }

    return NextResponse.json({
      vin: upperVin,
      make: result.Make || null,
      model: result.Model || null,
      year: result.ModelYear ? parseInt(result.ModelYear) : null,
      trim: result.Trim || null,
      engine: result.DisplacementL
        ? `${parseFloat(result.DisplacementL).toFixed(1)}L ${result.EngineCylinders ? result.EngineCylinders + '-cyl' : ''}`
        : result.EngineModel || null,
      fuel_type: result.FuelTypePrimary || null,
      drive_type: result.DriveType || null,
      body_type: result.BodyClass || null,
      country_of_manufacture: result.PlantCountry || null,
      doors: result.Doors ? parseInt(result.Doors) : null,
      identifier_type: result.VehicleType || 'VEHICLE',
      source_country: 'USA',
      recall_count: Array.isArray(recalls) ? recalls.length : 0,
    });
  } catch (error) {
    console.error('VIN preview error:', error);
    return NextResponse.json({ error: 'Could not retrieve vehicle data.' }, { status: 500 });
  }
}
