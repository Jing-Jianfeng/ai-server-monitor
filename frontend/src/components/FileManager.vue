<template>
  <div class="file-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>File Manager</span>
          <div class="header-actions">
            <el-switch
              v-model="useSSH"
              active-text="SSH Mode"
              inactive-text="Local Mode"
              @change="refreshFiles"
            />
            <el-button type="primary" @click="showUploadDialog = true">
              <el-icon><Upload /></el-icon>
              Upload File
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- Navigation Bar -->
      <div class="navigation-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="(part, index) in pathParts" :key="index" @click="navigateToPath(index)">
            {{ part || 'Root' }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <el-button @click="refreshFiles" size="small">
          <el-icon><Refresh /></el-icon>
          Refresh
        </el-button>
      </div>
      
      <!-- File List -->
      <el-table 
        :data="files" 
        style="width: 100%"
        @row-dblclick="handleFileDoubleClick"
        v-loading="loading"
      >
        <el-table-column width="60">
          <template #default="scope">
            <el-icon v-if="scope.row.type === 'folder'" size="20" color="#409EFF">
              <Folder />
            </el-icon>
            <el-icon v-else size="20" color="#67C23A">
              <Document />
            </el-icon>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" label="Name" sortable />
        
        <el-table-column prop="type" label="Type" width="100" />
        
        <el-table-column prop="size" label="Size" width="120" sortable>
          <template #default="scope">
            {{ scope.row.size ? formatFileSize(scope.row.size) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="modified" label="Modified" width="180" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.modified) }}
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="120">
          <template #default="scope">
            <el-button 
              v-if="scope.row.type === 'file'" 
              type="primary" 
              size="small"
              @click="downloadFile(scope.row)"
            >
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button 
              v-if="scope.row.type === 'folder'" 
              type="info" 
              size="small"
              @click="enterFolder(scope.row)"
            >
              <el-icon><Right /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Upload Dialog -->
    <el-dialog
      v-model="showUploadDialog"
      title="Upload File"
      width="500px"
    >
      <el-upload
        ref="uploadRef"
        :action="uploadUrl"
        :data="{ path: currentPath, ssh: useSSH }"
        :before-upload="beforeUpload"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        drag
        multiple
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          Drop file here or <em>click to upload</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            Files will be uploaded to: {{ currentPath }}
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <el-button @click="showUploadDialog = false">Cancel</el-button>
        <el-button type="primary" @click="submitUpload">Upload</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'
import { 
  Upload, 
  Download, 
  Folder, 
  Document, 
  Refresh, 
  Right, 
  UploadFilled 
} from '@element-plus/icons-vue'

export default {
  name: 'FileManager',
  components: {
    Upload,
    Download,
    Folder,
    Document,
    Refresh,
    Right,
    UploadFilled
  },
  data() {
    return {
      files: [],
      currentPath: '/home',
      useSSH: false,
      loading: false,
      showUploadDialog: false,
      uploadUrl: 'http://localhost:3000/api/files/upload'
    }
  },
  computed: {
    pathParts() {
      return this.currentPath.split('/').filter(part => part !== '')
    }
  },
  mounted() {
    this.refreshFiles()
  },
  methods: {
    async refreshFiles() {
      this.loading = true
      try {
        const response = await axios.get('http://localhost:3000/api/files', {
          params: {
            path: this.currentPath,
            ssh: this.useSSH
          }
        })
        this.files = response.data.sort((a, b) => {
          // Folders first, then files
          if (a.type === 'folder' && b.type === 'file') return -1
          if (a.type === 'file' && b.type === 'folder') return 1
          return a.name.localeCompare(b.name)
        })
      } catch (error) {
        this.$message.error('Failed to load files')
        console.error('Error loading files:', error)
      } finally {
        this.loading = false
      }
    },
    
    handleFileDoubleClick(row) {
      if (row.type === 'folder') {
        this.enterFolder(row)
      } else {
        this.downloadFile(row)
      }
    },
    
    enterFolder(folder) {
      this.currentPath = this.currentPath.endsWith('/') 
        ? this.currentPath + folder.name
        : this.currentPath + '/' + folder.name
      this.refreshFiles()
    },
    
    navigateToPath(index) {
      if (index === 0) {
        this.currentPath = '/' + this.pathParts[0]
      } else {
        this.currentPath = '/' + this.pathParts.slice(0, index + 1).join('/')
      }
      this.refreshFiles()
    },
    
    async downloadFile(file) {
      try {
        const response = await axios.get('http://localhost:3000/api/files/download', {
          params: {
            path: file.path,
            ssh: this.useSSH
          },
          responseType: 'blob'
        })
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', file.name)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        this.$message.success('File downloaded successfully')
      } catch (error) {
        this.$message.error('Failed to download file')
        console.error('Download error:', error)
      }
    },
    
    beforeUpload(file) {
      const isLt2M = file.size / 1024 / 1024 < 100 // 100MB limit
      if (!isLt2M) {
        this.$message.error('File size cannot exceed 100MB!')
      }
      return isLt2M
    },
    
    handleUploadSuccess(response, file) {
      this.$message.success(`${file.name} uploaded successfully`)
      this.refreshFiles()
    },
    
    handleUploadError(error, file) {
      this.$message.error(`Failed to upload ${file.name}`)
      console.error('Upload error:', error)
    },
    
    submitUpload() {
      this.$refs.uploadRef.submit()
      this.showUploadDialog = false
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    formatDate(dateString) {
      return new Date(dateString).toLocaleString()
    }
  }
}
</script>

<style scoped>
.file-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.el-breadcrumb-item {
  cursor: pointer;
}

.el-breadcrumb-item:hover {
  color: #409EFF;
}

.el-upload {
  width: 100%;
}

.el-upload__tip {
  margin-top: 10px;
  color: #606266;
}
</style>