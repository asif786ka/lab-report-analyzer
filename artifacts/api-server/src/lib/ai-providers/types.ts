export interface PatientInfo {
  name: string | null;
  age: number | null;
  sex: string | null;
  dateOfBirth: string | null;
  reportDate: string | null;
  labName: string | null;
}

export interface Biomarker {
  originalName: string;
  standardizedName: string;
  value: number;
  originalUnit: string;
  standardizedUnit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  classification: "optimal" | "normal" | "out_of_range";
  classificationDetail: string;
}

export interface LabReportResult {
  patient: PatientInfo;
  biomarkers: Biomarker[];
  summary: {
    total: number;
    optimal: number;
    normal: number;
    outOfRange: number;
  };
  aiProvider: string;
}

export interface AIProvider {
  readonly name: string;
  readonly id: string;
  readonly description: string;
  analyzeReport(pdfText: string): Promise<LabReportResult>;
}

export interface AIProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
