# AI Server Monitoring and File Management System

## Project Structure

```
ai-server-monitor/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── public/
└── frontend/
    ├── src/
    │   ├── App.vue
    │   ├── main.js
    │   └── components/
    │       ├── ServerOverview.vue
    │       ├── FileManager.vue
    │       └── SSHSettings.vue
    ├── package.json
    └── public/
```

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Linux environment (Ubuntu 20.04+ recommended)
- SSH access to target servers (if using remote monitoring)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install system dependencies (Ubuntu/Debian):**
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential python3
   ```

4. **For GPU monitoring, install NVIDIA drivers and tools:**
   ```bash
   sudo apt-get install -y nvidia-smi
   ```

5. **Configure file permissions:**
   ```bash
   # Ensure the application has access to system information
   sudo usermod -a -G sudo $USER
   ```

6. **Start the backend server:**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Vue CLI globally (if not already installed):**
   ```bash
   npm install -g @vue/cli
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run serve
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Configuration

### Backend Configuration

Edit the `CONFIG` object in `server.js`:

```javascript
const CONFIG = {
  port: 3000,                    // Backend server port
  fileRoot: '/home',            // Default file browser root
  ssh: {
    host: 'localhost',          // Default SSH host
    port: 22,                   // SSH port
    username: 'user',           // SSH username
    password: 'password'        // SSH password (can be configured via UI)
  }
};
```

### Frontend Configuration

The frontend automatically connects to `http://localhost:3000` by default. To change this, update the `baseURL` in `main.js`:

```javascript
axios.defaults.baseURL = 'http://your-backend-server:3000'
```

## Features

### 1. Server Overview Page

- **Basic Server Info**: OS, CPU, Memory, GPU, and Disk information
- **Real-time CPU Monitoring**: Live CPU usage chart with top 5 processes
- **Real-time GPU Monitoring**: GPU utilization for multiple GPUs with process list
- **Disk I/O Monitoring**: Read/write speeds for all mounted drives

### 2. File Manager Page

- **Directory Browsing**: Navigate through server filesystem
- **File Upload**: Upload files to the server
- **File Download**: Download files from the server
- **SSH Support**: All operations can be performed via SSH

### 3. SSH Settings Page

- **Connection Configuration**: Host, port, username, and authentication
- **Connection Testing**: Test SSH connectivity
- **Quick Connect Presets**: Save and load frequently used connections

## API Endpoints

### Server Monitoring

- `GET /api/server/info` - Get basic server information
- `GET /api/server/cpu` - Get CPU usage and top processes
- `GET /api/server/gpu` - Get GPU usage and processes
- `GET /api/server/disk` - Get disk I/O statistics

### File Management

- `GET /api/files` - List directory contents
- `POST /api/files/upload` - Upload file
- `GET /api/files/download` - Download file

### SSH Configuration

- `POST /api/ssh/config` - Update SSH configuration

## Security Considerations

1. **SSH Key Authentication**: Use SSH keys instead of passwords when possible
2. **File Access Control**: The system respects file system permissions
3. **Network Security**: Use HTTPS in production and secure the backend API
4. **Input Validation**: All inputs are validated before processing

## Production Deployment

### Using PM2 (Process Manager)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start backend with PM2:**
   ```bash
   cd backend
   pm2 start server.js --name "ai-server-monitor"
   ```

3. **Configure PM2 to start on boot:**
   ```bash
   pm2 startup
   pm2 save
   ```

### Using Nginx (Reverse Proxy)

1. **Install Nginx:**
   ```bash
   sudo apt-get install nginx
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Using Docker (Optional)

Create `Dockerfile` for backend:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - /:/host:ro
    privileged: true
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the Node.js process has appropriate permissions
2. **GPU Monitoring Not Working**: Install nvidia-smi and ensure proper GPU drivers
3. **SSH Connection Failed**: Check SSH credentials and network connectivity
4. **File Upload Issues**: Verify disk space and file permissions

### Logs

Backend logs are available in the console output or can be redirected to files:
```bash
npm start > server.log 2>&1
```

### Performance Optimization

1. **Monitoring Interval**: Adjust the 3-second update interval if needed
2. **Data Retention**: Limit the number of historical data points in charts
3. **File Operations**: Implement pagination for large directories

## Development

### Adding New Features

1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Create new components in `src/components/`
3. **Testing**: Test with both local and SSH modes

### Code Structure

- **Backend**: Express.js with modular route handlers
- **Frontend**: Vue 3 with Composition API and Element Plus UI
- **State Management**: Local component state (can be extended with Vuex/Pinia)

## Support

For issues and feature requests, please check the system logs and ensure all dependencies are properly installed. The system is designed to
