import { DTO } from "@repo/dto";
import type { EmailService } from "./EmailService";

class EmailServiceImpl implements EmailService {
    async runner(): Promise<DTO<null>> {        // fetch emails from provider
        const emails = await this.fetchEmails()
        if (!emails.success) return emails

        // Process with Batches
        const processed = await this.processWithBatches(emails.data)
        if (!processed.success) return processed

        return DTO.Success(null)
    }


    private async fetchEmails(): Promise<DTO<any[]>> {
        // fetch emails from provider
        return DTO.Success([])
    }


    private async processWithBatches(emails: any[]): Promise<DTO<any[]>> {

        //  make batches
        const batches = await this.makeBatches(emails)
        if (!batches.success) return batches

        // presist to db in batches in parallel
        const presisted = await this.presistBatchesToDB(batches.data)
        if (!presisted.success) return presisted

        //  enqueue batches in sequential
        const enqueued = await this.enqueueBatchesToQueue(batches.data)
        if (!enqueued.success) return enqueued


        return DTO.Success([])
    }

    /**
     * return Batch[]
     * @param emails 
     * @returns 
     */
    private async makeBatches(emails: any[]): Promise<DTO<any[]>> {

        return DTO.Success([])
    }
    private async presistBatchesToDB(batches: any[]): Promise<DTO<null>> {
        // presist to DB
        const promises = batches.map((batch: any) => this.presistBatchToDB(batch));

        const results = await Promise.all(promises)

        //  handle failure cases to be checked

        return DTO.Success(null)
    }

    private async presistBatchToDB(batch: any): Promise<DTO<null>> {
        // presist Batch to DB
        const promises = batch.emails.map((email: any) => this.presistEmailToDB(email));

        await Promise.all(promises);

        return DTO.Success(null);
    }

    private async presistEmailToDB(_email: any): Promise<DTO<null>> {
        // presist to DB

// CALL REPO
        return DTO.Success(null)
    }

    private async enqueueBatchesToQueue(batches: any[]): Promise<DTO<any[]>> {
        // enqueue emails to queue

        for (const batch of batches) {
            const enqueued = await this.enqueueBatchToQueue(batch)
            // check error case.
            if (!enqueued.success) {

                // log error

                continue;
            }
        }
        return DTO.Success([])
    }

    private async enqueueBatchToQueue(batch: any): Promise<DTO<null>> {

        const promises = batch.emails.map((email: any) => this.enqueueEmail(email));
        const results = await Promise.all(promises)

        //  handle failure cases to be checked
        return DTO.Success(null)

    }


    private async enqueueEmail(_email: any): Promise<DTO<null>> {
        // enqueue email to queue
// call queue provider.
        return DTO.Success(null)
    }
}


export default EmailServiceImpl;