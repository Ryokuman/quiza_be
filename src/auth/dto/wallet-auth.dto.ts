/**
 * MiniKit walletAuth()가 반환하는 SIWE 페이로드.
 * 프론트엔드에서 서명 결과 + nonce를 함께 전송한다.
 */
export interface IWalletAuth {
  /** SIWE 메시지 본문 */
  message: string;

  /** 지갑 서명 값 */
  signature: string;

  /** 지갑 주소 (EVM) */
  address: string;

  /** 서버에서 발급한 일회용 nonce (SIWE replay attack 방지) */
  nonce: string;
}
