export interface CreateOrderPayload {
  planId: string;
}

export interface CreateOrderResponse {
  orderId: string;
  paypalOrderId?: string;
  approvalUrl?: string;
  amount: number;
  currency: string;
}

export interface CaptureOrderPayload {
  orderId: string;
  paypalOrderId: string;
}

export interface CaptureOrderResponse {
  message: string;
  order: {
    id: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
    amount: number;
    plan: {
      id?: string;
      name: string;
      creditsIncluded: number;
    };
  };
}
