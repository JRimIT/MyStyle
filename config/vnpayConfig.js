export const VNP_TMNCODE    = process.env.VNP_TMNCODE || 'YOUR_TMNCODE';
export const VNP_HASHSECRET = process.env.VNP_HASHSECRET || 'YOUR_SECRET';
export const VNP_PAYURL     = process.env.VNP_PAYURL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
export const VNP_RETURNURL  = process.env.VNP_RETURNURL || 'http://localhost:4000/payment/vnpay/return';
export const VNP_VERSION    = '2.1.0';
export const VNP_COMMAND    = 'pay';
