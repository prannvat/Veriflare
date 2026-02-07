// API service for communicating with the backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface ApiError {
  message: string;
  code?: string;
}

export interface Job {
  id: string;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  category: string;
  paymentAmount: string;
  deadline: number;
  status: number;
  deliveryUrl?: string;
  createdAt: number;
}

export interface AttestationResult {
  success: boolean;
  proof?: {
    merkleProof: string[];
    data: any;
  };
  roundId?: number;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ==================== JOBS ====================
  
  async getJobs(filters?: { category?: string; status?: number }): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status !== undefined) params.set('status', String(filters.status));
    
    return this.request<Job[]>(`/jobs?${params.toString()}`);
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>(`/jobs/${id}`);
  }

  async createJob(job: Partial<Job>): Promise<Job> {
    return this.request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  // ==================== FDC ATTESTATIONS ====================
  
  async prepareCommitAttestation(
    repo: string,
    branch: string,
    commitHash: string
  ): Promise<{ requestBody: any; abiEncodedRequest: string }> {
    return this.request('/fdc/prepare-commit', {
      method: 'POST',
      body: JSON.stringify({ repo, branch, commitHash }),
    });
  }

  async prepareGistAttestation(
    gistId: string,
    walletAddress: string
  ): Promise<{ requestBody: any; abiEncodedRequest: string }> {
    return this.request('/fdc/prepare-gist', {
      method: 'POST',
      body: JSON.stringify({ gistId, walletAddress }),
    });
  }

  async submitAttestation(
    abiEncodedRequest: string
  ): Promise<{ txHash: string; roundId: number }> {
    return this.request('/fdc/submit', {
      method: 'POST',
      body: JSON.stringify({ abiEncodedRequest }),
    });
  }

  async waitForFinalization(roundId: number): Promise<{ finalized: boolean }> {
    return this.request('/fdc/wait', {
      method: 'POST',
      body: JSON.stringify({ roundId }),
    });
  }

  async fetchProof(
    roundId: number,
    requestBody: any
  ): Promise<{ proof: any }> {
    return this.request('/fdc/proof', {
      method: 'POST',
      body: JSON.stringify({ roundId, requestBody }),
    });
  }

  // Full attestation flow
  async attestCommit(
    repo: string,
    branch: string,
    commitHash: string
  ): Promise<AttestationResult> {
    return this.request('/fdc/attest-commit', {
      method: 'POST',
      body: JSON.stringify({ repo, branch, commitHash }),
    });
  }

  async attestGist(
    gistId: string,
    walletAddress: string
  ): Promise<AttestationResult> {
    return this.request('/fdc/attest-gist', {
      method: 'POST',
      body: JSON.stringify({ gistId, walletAddress }),
    });
  }

  // ==================== HEALTH ====================
  
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.request('/health');
  }
}

export const api = new ApiService();
