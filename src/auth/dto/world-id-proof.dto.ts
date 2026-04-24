/**
 * IDKit (네이티브 앱용) World ID proof 페이로드.
 * 추후 구현 예정.
 */
export interface IWorldIdProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
  action: string;
}
