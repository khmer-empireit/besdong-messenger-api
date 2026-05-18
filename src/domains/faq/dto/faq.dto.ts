import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ example: 'How do I reset my password?' })
  @IsString()
  @MinLength(1)
  question: string;

  @ApiProperty({ example: 'Go to Settings → Account → Reset Password.' })
  @IsString()
  @MinLength(1)
  answer: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order (lower = first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}

export class UpdateFaqDto {
  @ApiPropertyOptional({ example: 'How do I reset my password?' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  question?: string;

  @ApiPropertyOptional({ example: 'Go to Settings → Account → Reset Password.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  answer?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class FaqResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() question: string;
  @ApiProperty() answer: string;
  @ApiProperty() order_index: number;
  @ApiProperty() is_active: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class FaqListResponseDto {
  @ApiProperty({ type: [FaqResponseDto] }) items: FaqResponseDto[];
}
