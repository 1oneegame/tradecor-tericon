export interface GoszakupRequest {
    page: number;
    count_record: number;
}

export interface AnalysisResult {
    lot_id: string;
    announcement: string;
    customer: string;
    subject: string;
    subject_link: string;
    quantity: number;
    amount: number;
    purchase_type: string;
    status: string;
}

export interface PredictionResult {
    lot_id: string;
    announcement: string;
    customer: string;
    subject: string;
    subject_link: string;
    quantity: number;
    amount: number;
    purchase_type: string;
    status: string;
    suspicion_percentage: number;
    suspicion_level: SuspicionLevel;
}

export interface GoszakupResponse {
    success: boolean;
    data?: AnalysisResult[];
    error?: string;
}

export interface PredictionResponse {
    success: boolean;
    predictions?: PredictionResult[];
    execution_time?: number;
    error?: string;
}

export type SortType = 'probability_asc' | 'probability_desc' | 'level';
export type SuspicionLevel = 'High' | 'Medium' | 'Low';
export type SuspicionLevelFilter = 'all' | SuspicionLevel; 