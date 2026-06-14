import { DTO } from "@repo/dto";

interface EmailProvider {
    fetchEmails():Promise<DTO<any[]>>
}

