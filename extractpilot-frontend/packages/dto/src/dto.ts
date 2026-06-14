type DTO<T = null, E = unknown> = SuccessDTO<T> | FailedDTO<E>;

enum DTO_CODE {
    SUCCESS,
    HANDLED_ERROR,
    UNHANDLED_ERROR,
}

interface SuccessDTO<T> {
    success: true;
    code: DTO_CODE.SUCCESS;
    message: string | null;
    data: T;
}

/**
 * code 1 mean handled, code 2 means need to handle
 */
interface FailedDTO<E> {
    code: DTO_CODE.HANDLED_ERROR | DTO_CODE.UNHANDLED_ERROR;
    success: false;
    message: string;
    error: E | null;
}

// Your class with static methods that return the correct types
const DTO = {
    Success<T>(data: T, message: string | null = null): SuccessDTO<T> {
        const res: SuccessDTO<T> = {
            success: true,
            code: DTO_CODE.SUCCESS,
            message,
            data,
        };
        return res;
    },

    HandledError<E>(message: string, error: E | null = null): FailedDTO<E> {
        const dto: FailedDTO<E> = {
            success: false,
            code: DTO_CODE.HANDLED_ERROR,
            message,
            error,
        };
        return dto;
    },

    UnhandledError<E>(message: string, error: E | null = null): FailedDTO<E> {
        const dto: FailedDTO<E> = {
            success: false,
            code: DTO_CODE.UNHANDLED_ERROR,
            message,
            error,
        };
        return dto;
    },
};


export { DTO, DTO_CODE };