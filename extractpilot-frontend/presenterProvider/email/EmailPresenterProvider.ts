import { emailApiProvider } from "@/apiProvider/email/emailApiProvider";
import { BasePresenter } from "../shared/BasePresenter";

export type EmailListItemView = {
  id: string;
  provider: string;
  messageId: string;
  sender: string | null;
  subject: string | null;
  processingStatus: string;
  attachmentCount: number;
  createdAt: string | Date;
};

export interface EmailListState {
  loading: boolean;
  error: string | null;
  emails: EmailListItemView[];
  stats: Record<string, number> | null;
}

export class EmailPresenterProvider extends BasePresenter<EmailListState> {
  private state: EmailListState = {
    loading: true,
    error: null,
    emails: [],
    stats: null,
  };

  getState() {
    return this.state;
  }

  async init() {
    this.state = { ...this.state, loading: true, error: null };
    this.notify();
    try {
      const [emailsRes, statsRes] = await Promise.all([emailApiProvider.list({ limit: 50 }), emailApiProvider.stats()]);
      if (!emailsRes.success) throw new Error(emailsRes.message);
      if (!statsRes.success) throw new Error(statsRes.message);
      this.state = { loading: false, error: null, emails: emailsRes.data, stats: statsRes.data };
    } catch (e) {
      this.state = {
        ...this.state,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load",
      };
    }
    this.notify();
  }
}

export function createEmailPresenterProvider() {
  return new EmailPresenterProvider();
}
