import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
    {
        status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
        amount: Number,
        bankCode: String,
        bankTranNo: String,
        txnNo: String,
        payDate: String,
        message: String,
        via: String,
    },
    { _id: false },
);

const OrderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Types.ObjectId, ref: 'User' },
        items: [
            {
                productId: String,
                name: String,
                price: Number,
                qty: Number,
                imageUrl: String,
            },
        ],
        total: Number, // VND (không *100)
        status: { type: String, enum: ['unpaid', 'paid', 'cancel'], default: 'unpaid' },
        shippingAddress: {
            fullName: String,
            phone: String,
            address: String,
            note: String,
        },
        payment: PaymentSchema,
    },
    { timestamps: true },
);

export default mongoose.model('Order', OrderSchema);
