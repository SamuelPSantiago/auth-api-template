import { sendEmail } from "./emailService";
import { SendEmailParams } from "../types/email";

type EmailJob = SendEmailParams & { __attempts?: number; __nextAt?: number };

class InMemoryEmailQueue {
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(intervalMs = 200) {
    this.intervalMs = intervalMs;
    this.maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES || "3", 10);
    this.baseDelayMs = parseInt(process.env.EMAIL_RETRY_BASE_DELAY_MS || "500", 10);
  }

  enqueue(job: EmailJob): void {
    const normalized: EmailJob = { ...job, __attempts: 0, __nextAt: Date.now() };
    this.queue.push(normalized);
    this.start();
  }

  private start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.isProcessing) return;
    if (this.queue.length === 0) {
      this.stop();
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.isProcessing = true;
    try {
      const now = Date.now();
      if (job.__nextAt && job.__nextAt > now) {
        this.queue.push(job);
        return;
      }

      await sendEmail(job);
    } catch (error) {
      const err = error as Error;
      const attempts = (job.__attempts || 0) + 1;
      if (attempts <= this.maxRetries) {
        const delay = this.baseDelayMs * Math.pow(2, attempts - 1);
        const jitter = Math.floor(Math.random() * (this.baseDelayMs / 2));
        job.__attempts = attempts;
        job.__nextAt = Date.now() + delay + jitter;
        this.queue.push(job);
      } else {
        console.error("Email job dropped after max retries:", {
          to: job.toEmail,
          subject: job.subject,
          error: err.message,
          attempts,
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const emailQueue = new InMemoryEmailQueue(
  parseInt(process.env.EMAIL_QUEUE_INTERVAL_MS || "200", 10)
);

export function enqueueEmail(job: EmailJob): void {
  emailQueue.enqueue(job);
}


