# Lab 3 — Dịch vụ quản lý sản phẩm

## 1. Nội dung thực hiện

Dịch vụ Express cung cấp đủ 5 API CRUD sản phẩm. Lab 2 chạy cổng **3001**, Lab 3 chạy cổng **3002**, dùng database riêng `data/lab3.sqlite`. Mọi API sản phẩm gọi `GET /auth` của Lab 2 để xác thực Bearer token.

## 2. Hướng dẫn chạy

Cần Node.js **24.14 trở lên**, npm và mã nguồn Lab 2 nằm cạnh thư mục Lab 3. SQLite tích hợp trong Node, không cần cài máy chủ database.

Mở PowerShell thứ nhất tại **Lab-2**:

```powershell
npm ci
# Nếu chưa có .env, tạo cấu hình và khóa JWT ngẫu nhiên:
if (!(Test-Path .env)) {
  $secret = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
  @("PORT=3001", "JWT_SECRET=$secret", "JWT_EXPIRES_IN=1h", "DB_PATH=data/lab2.sqlite") | Set-Content .env
}
npm run seed
npm start
```

Nếu Lab 2 đã có `.env`, kiểm tra PORT là 3001 và JWT_SECRET hợp lệ. Tài khoản mẫu: **student / Student@123**.

Mở PowerShell thứ hai tại **Lab-3**:

```powershell
npm ci
Copy-Item .env.example .env
npm start
```

Chỉ sao chép `.env.example` lần đầu để tránh ghi đè cấu hình đã chỉnh. Server thông báo `Product service: http://localhost:3002`. Database và bảng tự được tạo. Dừng bằng Ctrl+C; chạy phát triển bằng `npm run dev`. Cảnh báo ExperimentalWarning của SQLite có thể xuất hiện.

| Cấu hình | Mặc định | Ý nghĩa |
| --- | --- | --- |
| PORT | 3002 | Cổng sản phẩm |
| AUTH_SERVICE_URL | http://127.0.0.1:3001 | URL gốc Lab 2 |
| AUTH_TIMEOUT_MS | 3000 | Thời gian chờ xác thực, mili giây |
| DB_PATH | data/lab3.sqlite | Đường dẫn database, tương đối từ Lab 3 |

Lab 3 không cần khóa JWT của Lab 2. Đổi cổng Lab 2 thì sửa AUTH_SERVICE_URL cho khớp.

## 3. Thử đăng nhập và CRUD bằng PowerShell

Mở terminal thứ ba, chạy lần lượt:

```powershell
$loginBody = @{ userName = 'student'; password = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('Student@123')) } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/' -ContentType 'application/json' -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.token)" }
$base = 'http://localhost:3002/products'

# Tạo sản phẩm: 201
$body = @{ name = 'Ban phim'; description = 'USB'; price = 199000.50; quantity = 10 } | ConvertTo-Json
$product = Invoke-RestMethod -Method Post -Uri $base -Headers $headers -ContentType 'application/json' -Body $body
$product

# Danh sách và chi tiết: 200
Invoke-RestMethod -Uri $base -Headers $headers
Invoke-RestMethod -Uri "$base/$($product.id)" -Headers $headers

# Cập nhật: 200
$body = @{ name = 'Ban phim'; description = 'Da cap nhat'; price = 189000; quantity = 8 } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "$base/$($product.id)" -Headers $headers -ContentType 'application/json' -Body $body

# Xóa: 204, body rỗng
Invoke-RestMethod -Method Delete -Uri "$base/$($product.id)" -Headers $headers
```

Postman: import `postman/Lab-3.postman_collection.json`, chạy theo thứ tự Login → Create → List → Detail → Update → Delete. Login tự lưu token; Create tự lưu ID. Sau khi xóa, gọi Detail sẽ trả 404.

## 4. Hợp đồng API

Mọi request sản phẩm cần `Authorization: Bearer <token>`. POST/PUT gửi JSON.

| Phương thức | URL | Thành công |
| --- | --- | --- |
| GET | /products | 200, mảng sản phẩm; rỗng là `[]` |
| GET | /products/:id | 200, sản phẩm chi tiết |
| POST | /products | 201, sản phẩm mới và header Location |
| PUT | /products/:id | 200, sản phẩm sau cập nhật |
| DELETE | /products/:id | 204, body rỗng |

Body POST/PUT:

```json
{"name":"Bàn phím","description":"USB","price":199000.50,"quantity":10}
```

- `name`: chuỗi, bỏ khoảng trắng đầu/cuối, 1–255 ký tự.
- `description`: chuỗi; bỏ qua sẽ là chuỗi rỗng.
- `price`: số 0–99999999.99, tối đa 2 chữ số thập phân.
- `quantity`: số nguyên 0–2147483647.

PUT cần đủ name, price, quantity; description bỏ qua sẽ bị thay bằng chuỗi rỗng. Không gửi số dưới dạng chuỗi. ID phải là số nguyên dương an toàn.

Phản hồi gồm `id`, `name`, `description`, `price`, `quantity`, `created_at`, `updated_at`. Database tự tạo timestamp UTC; cập nhật giữ created_at và đặt lại updated_at. JSON có thể hiển thị 199000.5 thay cho 199000.50, hai giá trị tương đương.

| Mã lỗi | Ý nghĩa |
| --- | --- |
| 400 | Dữ liệu, JSON hoặc ID sai |
| 401 | Thiếu, sai hoặc hết hạn token |
| 404 | Sản phẩm hoặc API không tồn tại |
| 413 | Body vượt 64 KB |
| 503 | Lab 2 không khả dụng, quá thời gian chờ hoặc phản hồi xác thực bất thường |
| 500 | Lỗi máy chủ |

## 5. Giải thích kiến trúc và mã nguồn

```text
Client -- đăng nhập --> Lab 2 :3001 --> database User
Client -- token + CRUD --> Lab 3 :3002
                           |-- GET /auth --> Lab 2
                           |-- SQL --> database products riêng
```

- `src/server.js`: đọc cấu hình, mở database và khởi động server.
- `src/config.js`: đọc `.env`, kiểm tra cổng, URL và timeout.
- `src/app.js`: ghép router, đọc JSON và xử lý lỗi chung.
- `src/routes/product.routes.js`: khai báo 5 route, áp dụng xác thực và kiểm tra ID.
- `src/middleware/auth.middleware.js`: gửi token tới Lab 2; chỉ cho xử lý tiếp khi Lab 2 xác thực thành công. Lỗi kết nối trả 503 và chặn thao tác dữ liệu.
- `src/controllers/product.controller.js`: kiểm tra đầu vào, gọi repository và chọn mã HTTP.
- `src/repositories/product.repository.js`: truy vấn SQL có tham số để dữ liệu client không bị ghép vào câu SQL.
- `src/db.js`: tạo bảng products với đủ 7 cột của đề và các ràng buộc dữ liệu.

Theo nguyên tắc SOA, hai service tách nghiệp vụ, cổng và database, giao tiếp qua HTTP. Lab 3 không đọc bảng User và không tự kiểm tra chữ ký JWT; Lab 2 chịu trách nhiệm xác thực. Vì kiểm tra mỗi request, Lab 3 phụ thuộc khả năng đáp ứng của Lab 2.

SQLite khai báo DECIMAL(10,2) nhưng không tự ép độ chính xác như kiểu decimal cố định. Controller kiểm tra giới hạn và số chữ số thập phân, schema bổ sung CHECK. Giá lưu bằng số SQLite/JavaScript phù hợp bài thực hành; ứng dụng kế toán nên dùng số nguyên đơn vị tiền nhỏ nhất hoặc kiểu decimal chính xác.

## 6. Kiểm thử

Cài dependency ở cả Lab 2 và Lab 3, sau đó tại Lab 3 chạy:

```powershell
npm test
```

Test tự khởi động service Lab 2 thật và Lab 3 trên cổng ngẫu nhiên, dùng database trong bộ nhớ, không sửa dữ liệu đang dùng. Kiểm tra đăng nhập, token thiếu/sai/hết hạn, CRUD, bản ghi không tồn tại, dữ liệu sai, JSON sai và Lab 2 ngừng hoạt động. Kết quả thực hiện: **5 test đạt, 0 lỗi** (gồm test tích hợp chính và 4 nhóm con).

## 7. Lỗi thường gặp

- EADDRINUSE: cổng đã bị chiếm; dừng server cũ hoặc đổi PORT và URL liên quan.
- 503: kiểm tra Lab 2 đang chạy và AUTH_SERVICE_URL đúng.
- 401: đăng nhập lại, gửi đúng Bearer token.
- Thiếu module: chạy npm ci; thiếu node:sqlite thì kiểm tra phiên bản Node.
- Test thiếu dependency Lab 2: chạy npm ci trong Lab-2 trước.

Bài chưa có phân quyền, phân trang hoặc giao diện. Mọi tài khoản được Lab 2 xác thực đều có thể thao tác sản phẩm.
