import { IsNotEmpty, IsString } from 'class-validator';

/**
 * MiniKit walletAuth()가 반환하는 SIWE 페이로드.
 * 프론트엔드에서 서명 결과 + nonce를 함께 전송한다.
 */
export class WalletAuthDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  signature!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  /** 서버에서 발급한 일회용 nonce (SIWE replay attack 방지) */
  @IsString()
  @IsNotEmpty()
  nonce!: string;
}
