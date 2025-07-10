const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Client } = require('ssh2');
const si = require('systeminformation');
const { exec } = require('child_process');
const { promisify } = require('util');

const app = express();
const execAsync = promisify(exec);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const CONFIG = {
  port: 3000,
  fileRoot: '/home',
  ssh: {
    host: 'localhost',
    port: 22,
    username: 'user',
    password: 'password'
  }
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || CONFIG.fileRoot;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Utility functions
const executeCommand = async (command, useSSH = false) => {
  if (useSSH) {
    return executeSSHCommand(command);
  }
  
  try {
    const { stdout, stderr } = await execAsync(command);
    return stdout;
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
};

const executeSSHCommand = (command) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        
        let output = '';
        stream.on('data', (data) => {
          output += data;
        });
        
        stream.on('close', () => {
          conn.end();
          resolve(output);
        });
      });
    });
    
    conn.on('error', reject);
    conn.connect(CONFIG.ssh);
  });
};

// API Routes

// 1. Server Overview - Basic Configuration
app.get('/api/server/info', async (req, res) => {
  try {
    const [osInfo, cpu, mem, graphics, disks] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.graphics(),
      si.fsSize()
    ]);

    const serverInfo = {
      os: {
        name: osInfo.distro,
        version: osInfo.release,
        kernel: osInfo.kernel
      },
      cpu: {
        model: cpu.brand,
        cores: cpu.cores,
        threads: cpu.cores * 2 // Assuming hyperthreading
      },
      memory: {
        total: Math.round(mem.total / (1024 * 1024 * 1024)) // GB
      },
      gpus: graphics.controllers.map(gpu => ({
        model: gpu.model,
        vram: gpu.vram ? Math.round(gpu.vram / (1024 * 1024)) : 'N/A'
      })),
      disks: disks.map(disk => ({
        mount: disk.mount,
        total: Math.round(disk.size / (1024 * 1024 * 1024)), // GB
        available: Math.round(disk.available / (1024 * 1024 * 1024)) // GB
      }))
    };

    res.json(serverInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Real-time CPU Monitoring
app.get('/api/server/cpu', async (req, res) => {
  try {
    const [cpuLoad, processes] = await Promise.all([
      si.currentLoad(),
      si.processes()
    ]);

    // Get top 5 CPU processes
    const topProcesses = processes.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 5)
      .map(proc => ({
        name: proc.name,
        memory: Math.round(proc.mem_rss / (1024 * 1024)), // MB
        pid: proc.pid,
        path: proc.command
      }));

    res.json({
      usage: Math.round(cpuLoad.currentLoad),
      processes: topProcesses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Real-time GPU Monitoring
app.get('/api/server/gpu', async (req, res) => {
  try {
    // Use nvidia-smi command for GPU monitoring
    const gpuOutput = await executeCommand('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits');
    const processOutput = await executeCommand('nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader,nounits');

    const gpuData = gpuOutput.trim().split('\n').map((line, index) => {
      const [utilization, memUsed, memTotal] = line.split(', ');
      return {
        id: index,
        utilization: parseInt(utilization),
        memoryUsed: parseInt(memUsed),
        memoryTotal: parseInt(memTotal)
      };
    });

    const gpuProcesses = processOutput.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [pid, name, memory] = line.split(', ');
        return {
          pid: parseInt(pid),
          name: name,
          memory: parseInt(memory),
          path: `/proc/${pid}/exe` // Simplified path
        };
      })
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 5);

    res.json({
      gpus: gpuData,
      processes: gpuProcesses
    });
  } catch (error) {
    // If nvidia-smi not available, return empty data
    res.json({
      gpus: [],
      processes: []
    });
  }
});

// 4. Real-time Disk I/O Monitoring
app.get('/api/server/disk', async (req, res) => {
  try {
    const [disks, diskIO] = await Promise.all([
      si.fsSize(),
      si.disksIO()
    ]);

    const diskData = disks.map(disk => ({
      mount: disk.mount,
      readSpeed: Math.round(diskIO.rIO_sec || 0),
      writeSpeed: Math.round(diskIO.wIO_sec || 0)
    }));

    res.json(diskData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. File Manager - Directory Browsing
app.get('/api/files', async (req, res) => {
  try {
    const dirPath = req.query.path || CONFIG.fileRoot;
    const useSSH = req.query.ssh === 'true';

    if (useSSH) {
      const output = await executeSSHCommand(`ls -la "${dirPath}"`);
      const files = parseSSHListing(output);
      res.json(files);
    } else {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const fileList = await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(dirPath, file.name);
          const stats = await fs.stat(fullPath);
          return {
            name: file.name,
            type: file.isDirectory() ? 'folder' : 'file',
            size: file.isFile() ? stats.size : null,
            modified: stats.mtime.toISOString(),
            path: fullPath
          };
        })
      );
      res.json(fileList);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse SSH ls output
const parseSSHListing = (output) => {
  const lines = output.trim().split('\n').slice(1); // Skip first line (total)
  return lines.map(line => {
    const parts = line.split(/\s+/);
    const permissions = parts[0];
    const size = parts[4];
    const name = parts.slice(8).join(' ');
    
    return {
      name,
      type: permissions[0] === 'd' ? 'folder' : 'file',
      size: permissions[0] === 'd' ? null : parseInt(size),
      modified: new Date().toISOString(), // Simplified
      path: name
    };
  });
};

// 6. File Upload
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  try {
    const useSSH = req.body.ssh === 'true';
    
    if (useSSH) {
      // Handle SSH upload
      const conn = new Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const remotePath = path.join(req.body.path || CONFIG.fileRoot, req.file.originalname);
          sftp.fastPut(req.file.path, remotePath, (err) => {
            conn.end();
            if (err) {
              res.status(500).json({ error: err.message });
            } else {
              res.json({ message: 'File uploaded successfully' });
            }
          });
        });
      });
      conn.connect(CONFIG.ssh);
    } else {
      res.json({ 
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: req.file.path
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. File Download
app.get('/api/files/download', async (req, res) => {
  try {
    const filePath = req.query.path;
    const useSSH = req.query.ssh === 'true';

    if (useSSH) {
      const conn = new Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          sftp.createReadStream(filePath).pipe(res);
        });
      });
      conn.connect(CONFIG.ssh);
    } else {
      res.download(filePath);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. SSH Configuration
app.post('/api/ssh/config', (req, res) => {
  try {
    const { host, port, username, password, privateKey } = req.body;
    
    CONFIG.ssh = {
      host,
      port: port || 22,
      username,
      password,
      privateKey
    };
    
    res.json({ message: 'SSH configuration updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`Server running on port ${CONFIG.port}`);
});

module.exports = app;
