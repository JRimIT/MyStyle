# Hướng dẫn sửa lỗi 404 cho /cart/apply-voucher

## ✅ Đã sửa:

1. ✅ Route đã được định nghĩa đúng trong `routes/cart.route.js`
2. ✅ Route đã được đăng ký trong `app.js` với `app.use("/", cartRoute)`
3. ✅ Đã thêm logging để debug
4. ✅ Đã cải thiện error handling
5. ✅ Đã thêm test routes

## 🔧 Các bước để fix:

### Bước 1: Restart Server
**QUAN TRỌNG:** Phải restart server sau khi thay đổi code!

```bash
# Dừng server (Ctrl+C)
# Sau đó start lại
npm run dev
# hoặc
npm start
```

### Bước 2: Kiểm tra Console khi Server Start
Khi server start, bạn sẽ thấy:
```
📦 Cart routes loaded:
  - GET /view/cart
  - POST /cart/add
  - PUT /cart/update/:itemId
  - DELETE /cart/remove/:itemId
  - DELETE /cart/clear
  - POST /cart/apply-voucher
  - POST /cart/remove-voucher
🔧 Registering routes...
✅ Cart routes registered at /
```

### Bước 3: Test Route
Mở browser và test:
- `http://localhost:4000/cart/test` → Nên thấy JSON response
- `http://localhost:4000/cart/test-post` (POST) → Test với Postman hoặc curl

### Bước 4: Kiểm tra trong Console khi Apply Voucher
Khi click "Áp dụng" voucher, check console server:
- Nếu thấy `🔔 POST /cart/apply-voucher hit!` → Route hoạt động
- Nếu không thấy → Route chưa được đăng ký hoặc bị block

## 🐛 Nếu vẫn lỗi 404:

### Kiểm tra 1: Route có được load không?
Check console khi server start, có thấy "Cart routes loaded" không?

### Kiểm tra 2: Có route nào conflict không?
```bash
# Search trong codebase
grep -r "cart/apply" routes/
```

### Kiểm tra 3: Middleware có block không?
Thử comment middleware verifyUser tạm thời:
```javascript
router.post("/cart/apply-voucher", async (req, res) => {
  // Test without middleware
  res.json({ success: true });
});
```

### Kiểm tra 4: Port có đúng không?
Đảm bảo bạn đang gọi đúng port (thường là 4000):
```javascript
// Trong Cart.ejs
fetch('http://localhost:4000/cart/apply-voucher', ...)
```

### Kiểm tra 5: Server có chạy không?
```bash
# Check process
netstat -ano | findstr :4000
```

## 📝 Test với Postman/curl:

```bash
# Test GET
curl http://localhost:4000/cart/test

# Test POST
curl -X POST http://localhost:4000/cart/test-post \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test apply voucher (cần token)
curl -X POST http://localhost:4000/cart/apply-voucher \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{"code": "SALE10"}'
```

## 🎯 Giải pháp nhanh:

1. **Restart server** (quan trọng nhất!)
2. Clear browser cache
3. Đảm bảo đã đăng nhập
4. Check console server để xem có log không

## 📞 Nếu vẫn không được:

Gửi cho tôi:
1. Console output khi server start
2. Console output khi click "Áp dụng"
3. Network tab trong DevTools (xem request/response)

