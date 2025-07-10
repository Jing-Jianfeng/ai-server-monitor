import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import axios from 'axios'

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3000'
axios.defaults.timeout = 10000

// Add axios to global properties
app.config.globalProperties.$http = axios

// Use Element Plus
app.use(ElementPlus)

app.mount('#app')
