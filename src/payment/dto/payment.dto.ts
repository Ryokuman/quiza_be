export interface IVerifyPaymentBody {
  txHash: string;
  amountWld: number;
  productType: string;
}

export interface IPaymentItem {
  id: string;
  tx_hash: string;
  amount_wld: string;
  product_type: string;
  status: string;
  created_at: string;
}

export interface IPremiumStatus {
  isPremium: boolean;
}
