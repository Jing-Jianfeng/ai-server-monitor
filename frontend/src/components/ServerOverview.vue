<template>
  <div class="server-overview">
    <!-- Server Basic Info -->
    <el-card class="info-card">
      <template #header>
        <span>Server Information</span>
      </template>
      <div v-if="serverInfo">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Operating System">
            {{ serverInfo.os.name }} {{ serverInfo.os.version }}
          </el-descriptions-item>
          <el-descriptions-item label="Kernel Version">
            {{ serverInfo.os.kernel }}
          </el-descriptions-item>
          <el-descriptions-item label="CPU">
            {{ serverInfo.cpu.model }}
          </el-descriptions-item>
          <el-descriptions-item label="Cores/Threads">
            {{ serverInfo.cpu.cores }}/{{ serverInfo.cpu.threads }}
          </el-descriptions-item>
          <el-descriptions-item label="Total Memory">
            {{ serverInfo.memory.total }} GB
          </el-descriptions-item>
          <el-descriptions-item label="GPUs">
            <div v-for="gpu in serverInfo.gpus" :key="gpu.model">
              {{ gpu.model }} ({{ gpu.vram }} GB)
            </div>
          </el-descriptions-item>
        </el-descriptions>
        
        <h3>Disk Storage</h3>
        <el-table :data="serverInfo.disks" style="width: 100%">
          <el-table-column prop="mount" label="Mount Point" width="180" />
          <el-table-column prop="total" label="Total (GB)" width="120" />
          <el-table-column prop="available" label="Available (GB)" width="120" />
          <el-table-column label="Usage">
            <template #default="scope">
              <el-progress 
                :percentage="((scope.row.total - scope.row.available) / scope.row.total * 100)" 
                :color="getProgressColor((scope.row.total - scope.row.available) / scope.row.total * 100)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- CPU Monitoring -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="monitor-card">
          <template #header>
            <span>CPU Usage</span>
          </template>
          <div ref="cpuChart" class="chart-container"></div>
          <el-table :data="cpuProcesses" style="width: 100%; margin-top: 20px;">
            <el-table-column prop="name" label="Process" width="120" />
            <el-table-column prop="memory" label="Memory (MB)" width="120" />
            <el-table-column prop="pid" label="PID" width="80" />
            <el-table-column prop="path" label="Path" />
          </el-table>
        </el-card>
      </el-col>
      
      <!-- Enhanced GPU Monitoring -->
      <el-col :span="12">
        <el-card class="monitor-card">
          <template #header>
            <span>GPU Usage</span>
          </template>
          <div ref="gpuChart" class="chart-container"></div>
          
          <!-- GPU Processes Table -->
          <el-table :data="gpuProcesses" style="width: 100%; margin-top: 20px;">
            <el-table-column prop="name" label="Process" width="120" />
            <el-table-column prop="memory" label="VRAM (MB)" width="120" />
            <el-table-column prop="pid" label="PID" width="80" />
            <el-table-column prop="path" label="Path" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- Detailed GPU Information -->
    <el-card class="monitor-card" v-if="gpuDetails.length > 0">
      <template #header>
        <span>Detailed GPU Information</span>
        <el-button 
          @click="refreshGPUDetails" 
          size="small" 
          type="primary"
          style="float: right;"
        >
          <el-icon><Refresh /></el-icon>
          Refresh
        </el-button>
      </template>
      
      <el-tabs v-model="activeGPUTab" type="card">
        <el-tab-pane 
          v-for="gpu in gpuDetails" 
          :key="gpu.id"
          :label="`GPU ${gpu.id}`"
          :name="gpu.id.toString()"
        >
          <div class="gpu-details">
            <!-- GPU Overview Cards -->
            <el-row :gutter="15" class="gpu-overview">
              <el-col :span="6">
                <el-card class="gpu-stat-card temperature">
                  <div class="stat-icon">
                    <el-icon size="24"><Thermometer /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ gpu.temperature.gpu }}°C</div>
                    <div class="stat-label">GPU Temperature</div>
                    <div class="stat-sublabel">Mem: {{ gpu.temperature.memory }}°C</div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="gpu-stat-card performance">
                  <div class="stat-icon">
                    <el-icon size="24"><TrendCharts /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ gpu.performance.state }}</div>
                    <div class="stat-label">Performance State</div>
                    <div class="stat-sublabel">{{ getPerformanceDescription(gpu.performance.state) }}</div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="gpu-stat-card power">
                  <div class="stat-icon">
                    <el-icon size="24"><Lightning /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ gpu.power.draw }}W</div>
                    <div class="stat-label">Power Consumption</div>
                    <div class="stat-sublabel">{{ gpu.power.percentage }}% of {{ gpu.power.limit }}W</div>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="6">
                <el-card class="gpu-stat-card utilization">
                  <div class="stat-icon">
                    <el-icon size="24"><Cpu /></el-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ gpu.utilization.gpu }}%</div>
                    <div class="stat-label">GPU Utilization</div>
                    <div class="stat-sublabel">Mem: {{ gpu.utilization.memory }}%</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <!-- Detailed Information -->
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <span>Memory Information</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="Total Memory">
                      {{ gpu.memory.total }} MB
                    </el-descriptions-item>
                    <el-descriptions-item label="Used Memory">
                      {{ gpu.memory.used }} MB ({{ gpu.memory.percentage }}%)
                    </el-descriptions-item>
                    <el-descriptions-item label="Free Memory">
                      {{ gpu.memory.free }} MB
                    </el-descriptions-item>
                  </el-descriptions>
                  
                  <div style="margin-top: 15px;">
                    <el-progress 
                      :percentage="gpu.memory.percentage" 
                      :color="getMemoryColor(gpu.memory.percentage)"
                      :stroke-width="8"
                    />
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <span>Clock Speeds</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="Graphics Clock">
                      {{ gpu.clocks.graphics.current }} MHz / {{ gpu.clocks.graphics.max }} MHz
                    </el-descriptions-item>
                    <el-descriptions-item label="Memory Clock">
                      {{ gpu.clocks.memory.current }} MHz / {{ gpu.clocks.memory.max }} MHz
                    </el-descriptions-item>
                    <el-descriptions-item label="Fan Speed">
                      {{ gpu.fan.speed }}%
                    </el-descriptions-item>
                  </el-descriptions>
                  
                  <div style="margin-top: 15px;">
                    <div class="clock-bars">
                      <div class="clock-bar">
                        <span>Graphics</span>
                        <el-progress 
                          :percentage="(gpu.clocks.graphics.current / gpu.clocks.graphics.max) * 100"
                          :show-text="false"
                          :stroke-width="6"
                        />
                      </div>
                      <div class="clock-bar">
                        <span>Memory</span>
                        <el-progress 
                          :percentage="(gpu.clocks.memory.current / gpu.clocks.memory.max) * 100"
                          :show-text="false"
                          :stroke-width="6"
                        />
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <!-- Additional Details -->
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="24">
                <el-card>
                  <template #header>
                    <span>Additional Information</span>
                  </template>
                  <el-descriptions :column="3" border>
                    <el-descriptions-item label="GPU Name">
                      {{ gpu.name }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Driver Version">
                      {{ gpu.driverVersion }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Bus ID">
                      {{ gpu.busId }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Compute Mode">
                      {{ gpu.computeMode }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Display Mode">
                      {{ gpu.display.mode }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Display Active">
                      {{ gpu.display.active }}
                    </el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Disk I/O Monitoring -->
    <el-card class="monitor-card">
      <template #header>
        <span>Disk I/O</span>
      </template>
      <el-table :data="diskIO" style="width: 100%">
        <el-table-column prop="mount" label="Mount Point" width="180" />
        <el-table-column prop="readSpeed" label="Read Speed (MB/s)" width="150" />
        <el-table-column prop="writeSpeed" label="Write Speed (MB/s)" width="150" />
        <el-table-column label="Activity">
          <template #default="scope">
            <el-tag v-if="scope.row.readSpeed > 0 || scope.row.writeSpeed > 0" type="success">
              Active
            </el-tag>
            <el-tag v-else type="info">Idle</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import axios from 'axios'
import { Refresh, Thermometer, TrendCharts, Lightning, Cpu } from '@element-plus/icons-vue'

export default {
  name: 'ServerOverview',
  components: {
    Refresh,
    Thermometer,
    TrendCharts,
    Lightning,
    Cpu
  },
  data() {
    return {
      serverInfo: null,
      cpuProcesses: [],
      gpuProcesses: [],
      gpuDetails: [],
      diskIO: [],
      cpuChart: null,
      gpuChart: null,
      cpuData: [],
      gpuData: [],
      timeLabels: [],
      updateInterval: null,
      activeGPUTab: '0'
    }
  },
  mounted() {
    this.loadServerInfo()
    this.initCharts()
    this.startMonitoring()
  },
  beforeUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  },
  methods: {
    async loadServerInfo() {
      try {
        const response = await axios.get('http://localhost:3000/api/server/info')
        this.serverInfo = response.data
      } catch (error) {
        this.$message.error('Failed to load server information')
      }
    },
    
    initCharts() {
      this.cpuChart = echarts.init(this.$refs.cpuChart)
      this.gpuChart = echarts.init(this.$refs.gpuChart)
      
      const cpuOption = {
        title: { text: 'CPU Usage %' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: this.timeLabels },
        yAxis: { type: 'value', max: 100 },
        series: [{
          name: 'CPU',
          type: 'line',
          data: this.cpuData,
          smooth: true,
          lineStyle: { color: '#409EFF' },
          areaStyle: { color: 'rgba(64, 158, 255, 0.3)' }
        }]
      }
      
      this.cpuChart.setOption(cpuOption)
      
      const gpuOption = {
        title: { text: 'GPU Usage %' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: this.timeLabels },
        yAxis: { type: 'value', max: 100 },
        series: []
      }
      
      this.gpuChart.setOption(gpuOption)
    },
    
    startMonitoring() {
      this.updateInterval = setInterval(() => {
        this.updateCPUData()
        this.updateGPUData()
        this.updateDiskIO()
      }, 3000)
    },
    
    async updateCPUData() {
      try {
        const response = await axios.get('http://localhost:3000/api/server/cpu')
        const data = response.data
        
        this.cpuProcesses = data.processes
        
        // Update chart data
        const now = new Date().toLocaleTimeString()
        this.timeLabels.push(now)
        this.cpuData.push(data.usage)
        
        // Keep only last 20 data points
        if (this.timeLabels.length > 20) {
          this.timeLabels.shift()
          this.cpuData.shift()
        }
        
        this.cpuChart.setOption({
          xAxis: { data: this.timeLabels },
          series: [{ data: this.cpuData }]
        })
      } catch (error) {
        console.error('Failed to update CPU data:', error)
      }
    },
    
    async updateGPUData() {
      try {
        const response = await axios.get('http://localhost:3000/api/server/gpu')
        const data = response.data
        
        this.gpuProcesses = data.processes
        this.gpuDetails = data.gpus
        
        // Update GPU chart with multiple GPUs
        const series = data.gpus.map((gpu, index) => ({
          name: `GPU ${index} (${gpu.name})`,
          type: 'line',
          data: this.gpuData[index] || [],
          smooth: true
        }))
        
        // Update GPU data arrays
        data.gpus.forEach((gpu, index) => {
          if (!this.gpuData[index]) {
            this.gpuData[index] = []
          }
          this.gpuData[index].push(gpu.utilization.gpu)
          
          if (this.gpuData[index].length > 20) {
            this.gpuData[index].shift()
          }
        })
        
        this.gpuChart.setOption({
          xAxis: { data: this.timeLabels },
          series: series
        })
      } catch (error) {
        console.error('Failed to update GPU data:', error)
      }
    },
    
    async updateDiskIO() {
      try {
        const response = await axios.get('http://localhost:3000/api/server/disk')
        this.diskIO = response.data
      } catch (error) {
        console.error('Failed to update disk I/O data:', error)
      }
    },
    
    async refreshGPUDetails() {
      await this.updateGPUData()
      this.$message.success('GPU details refreshed')
    },
    
    getProgressColor(percentage) {
      if (percentage < 50) return '#67C23A'
      if (percentage < 80) return '#E6A23C'
      return '#F56C6C'
    },
    
    getMemoryColor(percentage) {
      if (percentage < 60) return '#67C23A'
      if (percentage < 85) return '#E6A23C'
      return '#F56C6C'
    },
    
    getPerformanceDescription(state) {
      const descriptions = {
        'P0': 'Maximum Performance',
        'P1': 'High Performance',
        'P2': 'Balanced Performance',
        'P3': 'Power Saving',
        'P4': 'Minimum Performance'
      }
      return descriptions[state] || 'Unknown'
    }
  }
}
</script>

<style scoped>
.server-overview {
  padding: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.monitor-card {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.el-descriptions {
  margin-bottom: 20px;
}

.gpu-details {
  padding: 10px;
}

.gpu-overview {
  margin-bottom: 20px;
}

.gpu-stat-card {
  border: none;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  transition: all 0.3s ease;
}

.gpu-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gpu-stat-card.temperature {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.gpu-stat-card.performance {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.gpu-stat-card.power {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.gpu-stat-card.utilization {
  background: linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%);
}

.stat-icon {
  float: left;
  margin-right: 15px;
  margin-top: 10px;
  opacity: 0.8;
}

.stat-content {
  overflow: hidden;
  text-align: left;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
}

.stat-sublabel {
  font-size: 12px;
  color: #999;
}

.clock-bars {
  margin-top: 10px;
}

.clock-bar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.clock-bar span {
  width: 80px;
  font-size: 12px;
  margin-right: 10px;
}

.el-tabs {
  margin-top: 10px;
}

.el-tab-pane {
  padding: 0;
}
</style>