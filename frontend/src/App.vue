<template>
  <div id="app">
    <el-container>
      <el-header>
        <h1>AI Server Monitoring & File Management</h1>
        <el-menu 
          :default-active="activeTab" 
          mode="horizontal" 
          @select="handleTabSelect"
        >
          <el-menu-item index="overview">Server Overview</el-menu-item>
          <el-menu-item index="files">File Manager</el-menu-item>
          <el-menu-item index="settings">SSH Settings</el-menu-item>
        </el-menu>
      </el-header>
      
      <el-main>
        <!-- Server Overview Tab -->
        <div v-if="activeTab === 'overview'">
          <ServerOverview />
        </div>
        
        <!-- File Manager Tab -->
        <div v-if="activeTab === 'files'">
          <FileManager />
        </div>
        
        <!-- SSH Settings Tab -->
        <div v-if="activeTab === 'settings'">
          <SSHSettings />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import ServerOverview from './components/ServerOverview.vue'
import FileManager from './components/FileManager.vue'
import SSHSettings from './components/SSHSettings.vue'

export default {
  name: 'App',
  components: {
    ServerOverview,
    FileManager,
    SSHSettings
  },
  data() {
    return {
      activeTab: 'overview'
    }
  },
  methods: {
    handleTabSelect(key) {
      this.activeTab = key
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.el-header {
  background-color: #545c64;
  color: #fff;
  line-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-header h1 {
  margin: 0;
  font-size: 20px;
}

.el-main {
  padding: 20px;
}
</style>
