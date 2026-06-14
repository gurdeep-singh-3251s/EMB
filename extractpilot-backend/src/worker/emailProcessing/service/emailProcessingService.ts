import { DTO } from "@repo/dto";
import type { EmailProcessingJobInput } from "@repo/types/workerProcessing";

export interface EmailProcessingService {
  process(input: EmailProcessingJobInput): Promise<DTO<null>>;
}
