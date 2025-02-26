# Sử dụng hình ảnh Node.js mới nhất
FROM node:latest

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt code-server, localtunnel và axios
RUN curl -fsSL https://code-server.dev/install.sh | sh && \
    npm install -g localtunnel && \
    npm install axios && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy file start.js vào container
COPY start.js /app/start.js

# Chạy script start.js khi container khởi động
RUN node /app/start.js & tail -f /dev/null
