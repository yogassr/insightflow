const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Feedback = {
  id: number;
  text: string;
  category: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  date: string;
  source: string;
  created_at?: string;
};

export type FeedbackSummary = {
  positive: number;
  negative: number;
  neutral: number;
  categories: Record<string, number>;
};

export type UploadCSVResponse = {
  message: string;
  imported: number;
  skipped: number;
  summary: FeedbackSummary;
  records: Feedback[];
};

export type AdaptionStatus = {
  api_connected: boolean;
  platform: string;
  dataset_id: string;
  run_id: string;
  trained_model: string;
  run_status: string;
  categories: string[];
  best_win_rate?: number;
  row_count?: number;
  dataset_name?: string;
};

// Tracked Issues

export type IssueStatus = "Open" | "In Progress" | "Resolved";

export type Issue = {
  id: number;
  name: string;
  description: string;
  count: number;
  negative: number;
  positive_count?: number;
  neutral_count?: number;
  negative_count?: number;
  unclassified_count?: number;
  priority: "High" | "Medium" | "Low";
  status: IssueStatus;
  category: string;
  created_at?: string;
  updated_at?: string;
};

export type ReportInsightsRequest = {
  feedback_total: number;
  sentiment_valid_total: number;
  unclassified_sentiment_total: number;
  reporting_period: string;
  feedback_text_included: boolean;
  positive_total: number;
  neutral_total: number;
  negative_total: number;
  categories: Array<{ category: string; total: number; positive: number; neutral: number; negative: number; unclassified: number }>;
  issues: Array<{
    issue: string;
    category: string;
    frequency: number;
    positive_feedback_count: number;
    neutral_feedback_count: number;
    negative_feedback_count: number;
    unclassified_feedback_count: number;
    negative_feedback_percent: number;
    priority: "Critical" | "High" | "Medium" | "Low";
    status: IssueStatus;
  }>;
  monthly_sentiment: Array<{ month: string; total: number; positive: number; neutral: number; negative: number; unclassified: number; is_partial: boolean }>;
};

export type ReportInsightsResponse = { report: string; model: string };

async function parseResponse(response: Response) {
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      message = parsed.detail || body;
    } catch {
      // Keep a plain-text backend error as-is.
    }
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json();
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      `Could not reach the InsightFlow API at ${API_URL}. Confirm FastAPI is running on port 8000 and allows this frontend origin.`
    );
  }
}

export async function fetchFeedback(): Promise<Feedback[]> {
  const response = await request(`${API_URL}/feedback`, {
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function uploadFeedbackCSV(
  file: File
): Promise<UploadCSVResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await request(`${API_URL}/feedback/import`, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}

export async function fetchAdaptionStatus(): Promise<AdaptionStatus> {
  const response = await request(`${API_URL}/adaption/status`, {
    cache: "no-store",
  });

  return parseResponse(response);
}

export async function createFeedback(
  feedback: Omit<Feedback, "id" | "created_at">
): Promise<Feedback> {
  const response = await request(`${API_URL}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(feedback),
  });

  return parseResponse(response);
}

// Fetch real tracked issues from PostgreSQL through FastAPI.

export async function fetchIssues(): Promise<Issue[]> {
  const response = await request(`${API_URL}/issues`, {
    cache: "no-store",
  });

  return parseResponse(response);
}

// Persist an issue status change in the backend.

export async function updateIssueStatus(
  issueId: number,
  status: IssueStatus,
  completedCount?: number
): Promise<Issue> {
  const response = await request(`${API_URL}/issues/${issueId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, completed_count: completedCount }),
  });

  return parseResponse(response);
}

export async function generateReportInsights(
  metrics: ReportInsightsRequest
): Promise<ReportInsightsResponse> {
  const response = await request(`${API_URL}/reports/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metrics),
  });
  return parseResponse(response);
}

export async function generateAiInsights(
  metrics: ReportInsightsRequest
): Promise<ReportInsightsResponse> {
  const response = await request(`${API_URL}/insights/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metrics),
  });
  return parseResponse(response);
}
