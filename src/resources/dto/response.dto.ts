export class ApiResponseDto<T = any> {
  success: boolean;
  data: T | null;
  error: any;
  requested_at: Date;

  constructor(success: boolean, data: T | null = null, error: any = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.requested_at = new Date();
  }

  static success<T>(data: T): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, null);
  }

  static error(error: any): ApiResponseDto {
    return new ApiResponseDto(false, null, error);
  }
}
