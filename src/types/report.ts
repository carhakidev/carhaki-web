export interface VehiclePreview {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  engine: string;
  fuel_type: string;
  drive_type: string;
  body_type: string;
  country_of_manufacture: string;
  doors: number | null;
  identifier_type: string;
  source_country: string;
}

export interface Recall {
  recall_number: string;
  component: string;
  summary: string;
  remedy: string;
  is_open: boolean;
  source: string;
}

export interface Report {
  id: string;
  search_identifier: string;
  report_type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  overall_grade: string;
  risk_score: number;
  grade_label: string;
  grade_colour: string;
  processed_data: {
    vehicle: {
      make: string;
      model: string;
      year: number;
      trim: string;
      engine: string;
      fuel_type: string;
      drive_type: string;
      body_type: string;
      doors: number;
      country_of_manufacture: string;
    };
    recalls: Recall[];
    accidents: unknown[];
    theft: unknown[];
    title_history: unknown[];
    odometer_records: unknown[];
    market_value: {
      estimate_usd: number;
      estimate_ngn: number;
      source: string;
    };
    risk_score: number;
    overall_grade: string;
    grade_label: string;
    ai_summary: string;
  };
  ai_summary: string;
  share_token: string;
  is_public: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface ReportListItem {
  id: string;
  search_identifier: string;
  report_type: string;
  status: string;
  overall_grade: string;
  risk_score: number;
  grade_label: string;
  grade_colour: string;
  created_at: string;
  completed_at: string | null;
}
