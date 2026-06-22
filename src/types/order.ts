export interface OrderCreateResponse {
  order_id: string;
  authorization_url: string;
  access_code: string;
  reference: string;
  amount_ngn: number;
}

export interface OrderStatus {
  id: string;
  report_type: string;
  amount_ngn: number;
  quantity: number;
  payment_status: string;
  paystack_reference: string;
  created_at: string;
  paid_at: string | null;
  report_id: string | null;
  report_status: string | null;
}
