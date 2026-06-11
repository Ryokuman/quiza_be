export interface IGenerateNonceBody {
  amount: number;
  productType: string;
}

export interface IGenerateNonceResult {
  reference: string;
  amount: number;
  productType: string;
}

export interface IConfirmPaymentBody {
  transactionId: string;
  reference: string;
}

export interface IPaymentItem {
  id: string;
  tx_hash: string | null;
  amount: string;
  product_type: string;
  status: string;
  created_at: string;
}

export interface IPremiumStatus {
  isPremium: boolean;
}
