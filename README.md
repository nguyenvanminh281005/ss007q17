# Hệ thống Quản lý Lớp học (Classroom Management System)

<div align="center">
  <img src="https://raw.githubusercontent.com/nguyenvanminh281005/ss007q17/main/public/uit.png" alt="Logo" width="150"/>
</div>

<p align="center">
  Một ứng dụng web hiện đại giúp quản lý điểm danh, điểm số và sinh viên trong lớp học của bạn. Được xây dựng với React, TypeScript và Firebase, hệ thống này có thể dễ dàng tùy chỉnh cho bất kỳ lớp học nào.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Giấy phép MIT">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
  <img src="https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase" alt="Firebase">
  <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
</p>

## 🌟 Giới thiệu

Đây là một giải pháp toàn diện được thiết kế để đơn giản hóa công việc quản lý lớp học cho giáo viên và trợ giảng. Thay vì phải xử lý giấy tờ và bảng tính phức tạp, bạn có thể theo dõi việc điểm danh, cập nhật điểm số và quản lý thông tin sinh viên một cách hiệu quả ngay trên một nền tảng duy nhất.

## ✨ Tính năng chính

* **Điểm danh thông minh**:
    * Giao diện trực quan để điểm danh hàng ngày.
    * Chỉ cho phép điểm danh trong khung giờ và ngày học đã định.
    * Thống kê sĩ số, số sinh viên có mặt/vắng mặt theo thời gian thực.
* **Quản lý điểm số**:
    * Cập nhật điểm cho các cột điểm khác nhau (giữa kỳ, cuối kỳ, bài tập).
    * (Tính năng đang phát triển) Hỗ trợ nhập điểm từ file Excel.
* **Quản lý sinh viên**:
    * Hiển thị danh sách sinh viên theo từng nhóm.
    * Chức năng tìm kiếm sinh viên nhanh chóng theo tên, MSSV, hoặc nhóm.
* **Phân quyền linh hoạt**:
    * **Giáo viên**: Toàn quyền quản lý điểm danh, điểm số và phân quyền.
    * **Lớp trưởng/Nhóm trưởng**: Quyền điểm danh cho các thành viên trong nhóm của mình.
    * **Sinh viên**: Chỉ có quyền xem.
* **Báo cáo & Thống kê**:
    * Tự động tổng kết chuyên cần cuối kỳ.
    * Xuất dữ liệu điểm danh và điểm số ra file CSV/Excel.

## 🚀 Công nghệ sử dụng

Dự án này được xây dựng bằng các công nghệ web hiện đại, đảm bảo hiệu suất cao và trải nghiệm người dùng tốt nhất.

* **Frontend**:
    * [**React**](https://reactjs.org/) (với [**Vite**](https://vitejs.dev/))
    * [**TypeScript**](https://www.typescriptlang.org/)
    * [**Tailwind CSS**](https://tailwindcss.com/)
* **Backend & Cơ sở dữ liệu**:
    * [**Firebase**](https://firebase.google.com/) (Firestore Database, Authentication)

## 🔧 Cài đặt và Triển khai

Để chạy dự án này trên máy của bạn, hãy làm theo các bước sau.

### **1. Yêu cầu hệ thống**

* [Node.js](https://nodejs.org/) (phiên bản 18.x trở lên)
* `npm` hoặc `yarn`

### **2. Cài đặt dự án**

a. Clone repository về máy của bạn:

```bash
git clone [https://github.com/nguyenvanminh281005/ss007q17.git](https://github.com/nguyenvanminh281005/ss007q17.git)
cd ss007q17

b. Cài đặt các dependencies:

Bash

npm install
# HOẶC
yarn install
3. Thiết lập Firebase
a. Tạo dự án Firebase:

Truy cập Firebase Console và tạo một dự án mới.

b. Thiết lập Firestore:

Trong dự án Firebase của bạn, vào mục Firestore Database và tạo một cơ sở dữ liệu mới ở chế độ sản xuất (production mode).

Tạo các collection sau: students, attendance, permissions, grades.

c. Nhập dữ liệu sinh viên:

Bạn có thể thêm thủ công hoặc viết một script để import danh sách sinh viên vào collection students.

Mỗi document trong students nên có ID là MSSV của sinh viên đó.

Sử dụng tệp public/data.xlsx - Sheet1.csv làm mẫu định dạng dữ liệu.

d. Lấy khóa cấu hình:

Trong phần Project Settings > General, tìm đến mục "Your apps" và tạo một "Web app".

Sao chép đối tượng firebaseConfig.

e. Tạo tệp môi trường:

Trong thư mục gốc của dự án, tạo một tệp mới có tên .env.

Thêm các biến môi trường với thông tin bạn đã sao chép:

Đoạn mã

VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="12345..."
VITE_FIREBASE_APP_ID="1:12345...:web:..."
VITE_FIREBASE_MEASUREMENT_ID="G-..."
4. Chạy ứng dụng
Sau khi hoàn tất các bước trên, bạn có thể khởi động dự án:

Bash

npm run dev
# HOẶC
yarn dev
Ứng dụng sẽ chạy tại địa chỉ http://localhost:5173.

📂 Cấu trúc thư mục
/src
|-- /components     # Các component tái sử dụng (Auth, Layout, ...)
|-- /contexts       # React Context (ví dụ: AuthContext)
|-- /pages          # Các trang chính của ứng dụng (AttendancePage, ...)
|-- /services       # Các service tương tác với Firebase
|-- /types          # Định nghĩa các kiểu dữ liệu TypeScript
|-- /utils          # Các hàm tiện ích
|-- App.tsx         # Component gốc của ứng dụng
|-- main.tsx        # Điểm bắt đầu của ứng dụng React
📄 Giấy phép
Dự án này được cấp phép theo Giấy phép MIT. Xem chi tiết tại tệp LICENSE.