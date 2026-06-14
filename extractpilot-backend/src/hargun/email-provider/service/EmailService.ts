import { DTO } from "@repo/dto";

export interface EmailService {
  runner(): Promise<DTO<null>>;
}
