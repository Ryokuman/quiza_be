import { IsOptional, IsString } from 'class-validator';

export class DevLoginDto {
  @IsOptional()
  @IsString()
  world_id?: string;
}
