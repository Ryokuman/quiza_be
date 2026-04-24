export interface IGenerateNonceBody {
  amountWld: number;
  productType: string;
}

export interface IGenerateNonceResult {
  reference: string;
  amountWld: number;
  productType: string;
}

export interface IConfirmPaymentBody {
  transactionId: string;
  reference: string;
}

export interface IPaymentItem {
  id: string;
  tx_hash: string | null;
  amount_wld: string;
  product_type: string;
  status: string;
  created_at: string;
}

export interface IPremiumStatus {
  isPremium: boolean;
}
