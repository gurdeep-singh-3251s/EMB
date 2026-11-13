import { DTO, DTO_CODE, type DTO as DtoResult } from "@repo/dto";
import type { EmailDetail } from "@repo/feature-email";
import type { DefaultEmailWithCustomFields } from "@repo/types/parsedEmail";
import type {
  UserQueryResultsPayload,
  RestEmailDetailData,
  RestErrorEnvelope,
  RestExtractedRow,
  RestUserQueryResultsPublic,
  RestHandlerDeps,
  RestSuccessEnvelope,
} from "@repo/types/restTypes";

abstract class BaseRestController {
  constructor(protected readonly deps: RestHandlerDeps) {}

  protected get ctx() {
    return this.deps.getContext();
  }

  protected async readJson(req: Request): Promise<unknown> {
    const max = this.deps.env.restBodyMaxBytes ?? 1_048_576;
    const len = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(len) && len > max) {
      throw new Error(`Request body too large (max ${max} bytes)`);
    }
    try {
      const text = await req.text();
      if (text.length > max) {
        throw new Error(`Request body too large (max ${max} bytes)`);
      }
      if (!text.trim()) return null;
      return JSON.parse(text) as unknown;
    } catch (e) {
      if (e instanceof Error && e.message.includes("too large")) throw e;
      return null;
    }
  }

  protected fromDto<T, E>(dto: DtoResult<T, E>, okStatus: number = 200): Response {
    if (dto.success) {
      return this.success(dto.data, dto.message, okStatus);
    }
    let status = 500;
    if (dto.code === DTO_CODE.HANDLED_ERROR) {
      status = 400;
    }
    return this.fail(dto, status);
  }

  protected success<T>(data: T, message: string | null, status: number): Response {
    const body: RestSuccessEnvelope<T> = {
      success: true,
      message,
      data,
    };
    return Response.json(body, { status });
  }

  protected fail<E>(dto: Extract<DtoResult<null, E>, { success: false }>, status: number): Response {
    const body: RestErrorEnvelope<E> = {
      success: false,
      message: dto.message,
      error: dto.error,
    };
    return Response.json(body, { status });
  }

  protected validationError<E>(message: string, error: E): Response {
    return this.fromDto(DTO.HandledError(message, error));
  }

  protected notFound(message: string): Response {
    return this.fail(DTO.HandledError(message, null), 404);
  }

  protected toUserQueryResultsPublic(payload: UserQueryResultsPayload): RestUserQueryResultsPublic {
    const extractedData: RestExtractedRow[] = payload.extractedData.map((row) => ({
      emailId: row.emailId,
      subject: row.subject,
      sender: row.sender,
      processingStatus: row.processingStatus,
      extracted: row.extracted,
      source: row.source,
    }));
    return {
      count: payload.count,
      completedCount: payload.completedCount,
      extractedData,
    };
  }

  protected toEmailDetailRestData(detail: EmailDetail): RestEmailDetailData {
    const extracted = this.readExtractedFields(detail);
    return {
      id: detail.id,
      provider: detail.provider,
      messageId: detail.messageId,
      sender: detail.sender,
      subject: detail.subject,
      processingStatus: detail.processingStatus,
      attachmentCount: detail.attachmentCount,
      createdAt: detail.createdAt,
      rawContent: detail.rawContent,
      userQueryId: this.undefinedToNull(detail.userQueryId),
      userQuerySchema: this.undefinedToNull(detail.userQuerySchema),
      classificationResult: this.undefinedToNull(detail.classificationResult),
      parsedJson: detail.parsedJson,
      extracted,
    };
  }

  private undefinedToNull<T>(value: T | undefined): T | null {
    if (value === undefined) {
      return null;
    }
    return value;
  }

  private readExtractedFields(
    detail: EmailDetail,
  ): DefaultEmailWithCustomFields | Record<string, unknown> | null {
    if (detail.parsedJson === null) {
      return null;
    }
    return detail.parsedJson.email;
  }
}

export { BaseRestController };
