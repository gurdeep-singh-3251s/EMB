import { DTO } from "@repo/dto";
import type { LoadEmailInput, ProcessingContext } from "@repo/types/workerProcessing";
import type { FailureHandlerInput, PersistStepResult } from "./workerProcessingTypes";

export interface ILoadEmailProvider {
  run(input: LoadEmailInput): Promise<DTO<ProcessingContext>>;
}

export interface IMarkProcessingProvider {
  run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>>;
}

export interface IClassifyProvider {
  run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>>;
}

export interface IClassifyAndExtractProvider {
  run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>>;
}

export interface IParseAttachmentsProvider {
  run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>>;
}

export interface IFinalExtractProvider {
  run(ctx: ProcessingContext): Promise<DTO<ProcessingContext>>;
}

export interface IPersistResultProvider {
  run(ctx: ProcessingContext): Promise<DTO<PersistStepResult>>;
}

export interface IPersistSkippedProvider {
  run(ctx: ProcessingContext): Promise<DTO<PersistStepResult>>;
}

export interface IFailureHandlerProvider {
  run(input: FailureHandlerInput): Promise<DTO<null>>;
}
