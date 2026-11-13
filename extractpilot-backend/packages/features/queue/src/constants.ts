export const EMAIL_PROCESSING_QUEUE = process.env.EMAIL_PROCESSING_QUEUE ?? "email-processing";
export const EMAIL_PROCESSING_DLQ = process.env.EMAIL_PROCESSING_DLQ ?? "email-processing-dlq";
export const EMAIL_PROCESSING_JOB = "process-email";
export const EMAIL_DLQ_JOB = "dead-letter";
