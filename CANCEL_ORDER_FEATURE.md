# 🚫 Tính năng Hủy Đơn Hàng (Cancel Order)

## ✅ Đã hoàn thành

### 📝 **Tổng quan chức năng**
Khách hàng có thể xem danh sách đơn hàng và hủy đơn hàng trong các trường hợp sau:
- ✅ Đơn đang ở trạng thái **Pending** (Chờ xác nhận)
- ✅ Đơn đang ở trạng thái **Processing** (Đang xử lý)
- ❌ KHÔNG THỂ hủy đơn đang **Shipping** (Đang giao) hoặc **Delivered** (Đã giao)

### 🎯 **Các tính năng chính**

#### 1. **Xem danh sách đơn hàng** (`/orders`)
- Hiển thị tất cả đơn hàng của user
- Thông tin chi tiết: mã đơn, ngày đặt, sản phẩm, tổng tiền, trạng thái
- Phương thức thanh toán (Ví hoặc COD)

#### 2. **Hủy đơn hàng**
- Nút "Hủy đơn hàng" chỉ hiện với đơn Pending/Processing
- Modal xác nhận hủy với lý do (tùy chọn)
- **Hoàn tiền tự động** nếu đã thanh toán qua ví
- Hiển thị thông tin đơn đã hủy (thời gian, lý do)

#### 3. **Thanh toán (Checkout)**
- Modal thanh toán từ giỏ hàng
- Chọn phương thức: Ví điện tử hoặc COD
- Nhập địa chỉ giao hàng
- Tóm tắt đơn: tiền hàng, giảm giá, phí ship
- Tự động redirect đến `/orders` sau khi đặt hàng thành công

### 📁 **Files đã tạo/sửa**

#### **1. Model: `models/order.model.js`**
- Thêm trạng thái: `["Pending", "Processing", "Shipping", "Delivered", "Cancelled"]`
- Thêm fields:
  - `cancelledAt`: Thời gian hủy
  - `cancelReason`: Lý do hủy
  - `refunded`: Đã hoàn tiền hay chưa

#### **2. Routes: `routes/order.route.js`**
- `POST /checkout` - Tạo đơn hàng mới
- `GET /orders` - Xem danh sách đơn hàng
- `POST /orders/:orderId/cancel` - Hủy đơn hàng

#### **3. Views**
- `views/pages/Orders.ejs` - Trang danh sách đơn hàng
- `views/pages/Cart.ejs` - Thêm Checkout Modal

#### **4. CSS**
- `public/css/Orders.css` - Style cho trang Orders
- `public/css/Cart.css` - Thêm style cho Checkout Modal

#### **5. App: `app.js`**
- Import và đăng ký `orderRoute`

---

## 🚀 **Hướng dẫn sử dụng**

### **1. Xem đơn hàng**
```
Navbar → Click vào avatar → Chọn "📦 Orders"
Hoặc truy cập: http://localhost:4000/orders
```

### **2. Hủy đơn hàng**
1. Vào trang Orders
2. Tìm đơn hàng muốn hủy (phải là Pending hoặc Processing)
3. Click nút **"Hủy đơn hàng"**
4. Chọn lý do hủy (tùy chọn)
5. Click **"Xác nhận hủy"**

**Kết quả:**
- Đơn COD: Hủy ngay lập tức
- Đơn đã thanh toán qua ví: Hủy + Hoàn tiền vào ví

### **3. Đặt hàng mới (Checkout)**
1. Thêm sản phẩm vào giỏ hàng
2. Vào `/view/cart`
3. Click **"Thanh toán"**
4. Nhập địa chỉ giao hàng
5. Chọn phương thức thanh toán:
   - **Ví điện tử**: Trừ tiền ngay
   - **COD**: Thanh toán khi nhận hàng
6. Click **"Xác nhận đặt hàng"**
7. Tự động chuyển đến `/orders`

---

## 📊 **Luồng hoạt động**

### **Luồng đặt hàng:**
```
Giỏ hàng → Click "Thanh toán" → Modal Checkout 
→ Nhập thông tin → Xác nhận 
→ Tạo đơn (Order) → Xóa giỏ hàng → Redirect /orders
```

### **Luồng hủy đơn:**
```
Danh sách đơn → Click "Hủy đơn hàng" → Modal xác nhận 
→ Chọn lý do → Xác nhận hủy
→ Cập nhật trạng thái → Hoàn tiền (nếu có) → Reload
```

---

## 🔒 **Điều kiện hủy đơn**

| Trạng thái đơn | Có thể hủy? | Hoàn tiền? |
|----------------|-------------|------------|
| Pending        | ✅ Có       | ✅ Có (nếu đã trả) |
| Processing     | ✅ Có       | ✅ Có (nếu đã trả) |
| Shipping       | ❌ Không    | ⚠️ Liên hệ CSKH |
| Delivered      | ❌ Không    | ❌ Không |
| Cancelled      | ❌ Đã hủy rồi | - |

---

## 🎨 **Giao diện**

### **Trang Orders (`/orders`)**
- Header đẹp với icon
- List đơn hàng dạng card
- Badge màu theo trạng thái
- Thông tin đơn đầy đủ
- Nút hành động (Hủy, Chi tiết)
- Empty state khi chưa có đơn

### **Modal Checkout**
- Gradient header
- Input địa chỉ
- Radio chọn thanh toán
- Card hiển thị số dư ví
- Tóm tắt đơn hàng chi tiết

### **Modal Hủy đơn**
- Cảnh báo màu vàng
- Dropdown lý do hủy
- Thông tin hoàn tiền
- Xác nhận trước khi hủy

---

## 🧪 **Test chức năng**

### **1. Test đặt hàng:**
```bash
1. Login vào hệ thống
2. Thêm sản phẩm vào giỏ
3. Vào /view/cart
4. Click "Thanh toán"
5. Chọn phương thức & nhập địa chỉ
6. Xác nhận đặt hàng
7. Kiểm tra redirect đến /orders
```

### **2. Test hủy đơn COD:**
```bash
1. Tạo đơn với phương thức COD
2. Vào /orders
3. Click "Hủy đơn hàng"
4. Chọn lý do → Xác nhận
5. Kiểm tra trạng thái đổi thành "Cancelled"
```

### **3. Test hủy đơn Wallet:**
```bash
1. Nạp tiền vào ví (ví dụ: 500,000 VND)
2. Đặt hàng với ví (ví dụ: 200,000 VND)
3. Kiểm tra số dư còn: 300,000 VND
4. Hủy đơn hàng
5. Kiểm tra số dư trở lại: 500,000 VND ✅
```

### **4. Test điều kiện không thể hủy:**
```bash
1. Vào MongoDB Compass
2. Đổi trạng thái đơn thành "Shipping"
3. Reload /orders
4. Nút "Hủy đơn hàng" biến mất ✅
```

---

## 🛠️ **API Endpoints**

### `POST /checkout`
**Body:**
```json
{
  "paymentMethod": "wallet" | "cod",
  "address": "Địa chỉ giao hàng"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Đặt hàng thành công!",
  "orderId": "...",
  "totalPrice": 200000
}
```

### `GET /orders`
- Trả về EJS render danh sách đơn hàng

### `POST /orders/:orderId/cancel`
**Body:**
```json
{
  "reason": "Lý do hủy (optional)"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Đơn hàng đã được hủy và hoàn 200,000 VND vào ví",
  "refunded": true,
  "refundAmount": 200000
}
```

---

## 📌 **Lưu ý**

1. **Hoàn tiền tự động:**
   - Chỉ hoàn tiền cho đơn thanh toán qua ví
   - Số tiền hoàn = `order.totalPrice`
   - Cập nhật ngay vào `user.balance`

2. **Voucher đã dùng:**
   - Khi checkout, voucher sẽ tăng `usedCount`
   - Khi hủy đơn, voucher **KHÔNG giảm** `usedCount` (tránh abuse)

3. **Giỏ hàng:**
   - Sau checkout, giỏ hàng tự động xóa
   - Sau hủy đơn, **KHÔNG** khôi phục giỏ hàng

4. **Admin quản lý:**
   - Admin có thể xem tất cả đơn ở `/admin/orders`
   - Admin có thể đổi trạng thái đơn

---

## ✨ **Tính năng nâng cao có thể thêm**

- [ ] Chi tiết đơn hàng (modal hoặc page riêng)
- [ ] Track đơn hàng (shipping status)
- [ ] Khôi phục giỏ hàng khi hủy đơn
- [ ] Email/SMS thông báo khi hủy đơn
- [ ] Lịch sử hủy đơn
- [ ] Giới hạn số lần hủy đơn của user
- [ ] Đánh giá sản phẩm sau khi nhận hàng

---

## 🎉 **Hoàn thành!**

Chức năng hủy đơn hàng đã được triển khai đầy đủ với:
- ✅ Giao diện đẹp, responsive
- ✅ Logic nghiệp vụ hoàn chỉnh
- ✅ Hoàn tiền tự động
- ✅ Validation đầy đủ
- ✅ UX/UI tốt

**Restart server và test ngay!** 🚀

