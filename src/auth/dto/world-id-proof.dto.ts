import { IsNotEmpty, IsString } from 'class-validator';

export class WorldIdProofDto {
  @IsString()
  @IsNotEmpty()
  merkle_root!: string;

  @IsString()
  @IsNotEmpty()
  nullifier_hash!: string;

  @IsString()
  @IsNotEmpty()
  proof!: string;

  @IsString()
  @IsNotEmpty()
  verification_level!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;
}
