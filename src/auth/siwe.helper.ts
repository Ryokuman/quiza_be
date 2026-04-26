/**
 * @worldcoin/minikit-js/siwe 래퍼.
 * moduleResolution: "node"에서 subpath exports를 해석 못하므로
 * 런타임에 직접 .cjs 파일을 require하여 사용.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
function loadSiwe() {
  // Node.js CJS 런타임에서만 실행됨. Nestia SDK 분석 시점에서는 실행되지 않음.
  return require(
    /* webpackIgnore: true */
    '@worldcoin/minikit-js/build/siwe-exports.cjs'
  );
}

export async function verifySiweMessage(
  payload: { message: string; signature: string; address: string },
  nonce: string,
): Promise<{ isValid: boolean; siweMessageData: { address?: string } }> {
  const { verifySiweMessage: verify } = loadSiwe();
  return verify(payload, nonce);
}
