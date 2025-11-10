# Hướng dẫn Debug và Test Voucher

## 🔍 Các bước để kiểm tra voucher

### 1. Kiểm tra voucher trong database

Truy cập: `GET /api/vouchers/debug/all`

Hoặc trong MongoDB:
```javascript
db.vouchers.find({}).pretty()
```

### 2. Tạo voucher mẫu bằng script

```bash
npm run seed:vouchers
```

Script sẽ tạo các voucher mẫu:
- `SALE10` - Giảm 10%
- `SALE20` - Giảm 20%
- `FREESHIP` - Miễn phí vận chuyển
- `DISCOUNT50K` - Giảm 50k
- `WELCOME` - Giảm 15%

### 3. Tạo voucher thủ công trong MongoDB

```javascript
db.vouchers.insertOne({
  code: "SALE10",
  name: "Giảm 10%",
  description: "Giảm 10% cho đơn hàng từ 100k",
  type: "percentage",
  discountValue: 10,
  minPurchaseAmount: 100000,
  maxDiscountAmount: 50000,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2025-12-31"),
  isActive: true,
  usageLimit: 1000,
  usageLimitPerUser: 1,
  usedCount: 0
})
```

**Lưu ý quan trọng:**
- Code sẽ tự động được chuyển thành UPPERCASE khi save
- Code sẽ tự động trim spaces
- Đảm bảo `isActive: true`
- Đảm bảo `startDate` <= hiện tại <= `endDate`

### 4. Kiểm tra trong console

Khi nhập voucher không tồn tại, check console server để xem:
- Available vouchers: danh sách các mã có sẵn
- Searching for code: mã đang tìm kiếm

### 5. Test voucher qua API

```bash
# Validate voucher
POST /api/vouchers/validate
{
  "code": "SALE10"
}

# Apply voucher to cart
POST /cart/apply-voucher
{
  "code": "SALE10"
}
```

## 🐛 Các vấn đề thường gặp

### Vấn đề 1: "Mã voucher không tồn tại"

**Nguyên nhân:**
- Code trong database có format khác (có spaces, lowercase, etc.)
- Voucher chưa được tạo
- Code bị sai chính tả

**Giải pháp:**
1. Check console server để xem available codes
2. Đảm bảo code trong database là UPPERCASE và không có spaces
3. Sử dụng script seed hoặc tạo lại voucher

### Vấn đề 2: Voucher không áp dụng được

**Nguyên nhân:**
- `isActive: false`
- Vượt quá thời gian (startDate/endDate)
- Đã hết lượt sử dụng (usageLimit)
- Đơn hàng chưa đạt minPurchaseAmount

**Giải pháp:**
1. Check status trong admin panel: `/admin/vouchers`
2. Kiểm tra điều kiện minPurchaseAmount
3. Kiểm tra thời gian startDate và endDate

### Vấn đề 3: Code không match

**Nguyên nhân:**
- Code có ký tự đặc biệt
- Code có spaces
- Case sensitivity

**Giải pháp:**
- Code sẽ tự động normalize khi save
- Nếu đã có voucher cũ, cần update lại:
```javascript
db.vouchers.updateMany(
  {},
  [{ $set: { code: { $toUpper: { $trim: "$code" } } } }]
)
```

## 📝 Checklist khi tạo voucher

- [ ] Code là UPPERCASE (sẽ tự động)
- [ ] Code không có spaces (sẽ tự động)
- [ ] `isActive: true`
- [ ] `startDate` <= hiện tại
- [ ] `endDate` >= hiện tại
- [ ] `minPurchaseAmount` hợp lý
- [ ] `discountValue` đúng với type
- [ ] `usageLimit` đủ lớn hoặc null

## 🎯 Test nhanh

1. Chạy seed: `npm run seed:vouchers`
2. Vào giỏ hàng: `/view/cart`
3. Nhập mã: `SALE10`
4. Click "Áp dụng"
5. Kiểm tra tổng tiền đã giảm chưa

