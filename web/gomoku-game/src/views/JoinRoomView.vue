<template>
  <div class="join-room">
    <div class="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-center mb-6">加入游戏房间</h1>
      
      <form @submit.prevent="joinRoom" class="space-y-6">
        <div class="flex flex-col space-y-2">
          <label for="playerName" class="text-sm font-medium text-gray-700">
            您的昵称
          </label>
          <input
            id="playerName"
            v-model="playerName"
            type="text"
            class="input w-full"
            placeholder="请输入您的昵称"
            required
          />
        </div>
        
        <div class="flex flex-col space-y-2">
          <label for="roomId" class="text-sm font-medium text-gray-700">
            房间ID
          </label>
          <input
            id="roomId"
            v-model="roomId"
            type="text"
            class="input w-full"
            placeholder="请输入房间ID"
            required
          />
        </div>
        
        <PasswordInput v-model="password" />
        
        <div class="pt-4">
          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="loading"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-sign-in-alt mr-2"></i>
            加入房间
          </button>
        </div>
      </form>
      
      <div v-if="error" class="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>
      
      <div class="mt-6 text-center">
        <router-link to="/" class="text-blue-600 hover:text-blue-800 text-sm">
          <i class="fas fa-arrow-left mr-1"></i> 返回首页
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import PasswordInput from '@/components/PasswordInput.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

const playerName = ref('');
const roomId = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// 检查URL中是否包含房间ID，以及尝试恢复之前的状态
onMounted(() => {
  if (route.query.roomId) {
    roomId.value = route.query.roomId;
  }
  
  // 尝试从本地存储获取之前的玩家名称
  const savedState = gameStore.loadStateFromLocalStorage();
  if (savedState) {
    playerName.value = savedState.playerName || '';
  }
});

async function joinRoom() {
  if (!playerName.value || !roomId.value || !password.value) {
    error.value = '请填写所有必填字段';
    return;
  }
  
  try {
    loading.value = true;
    error.value = '';
    
    await gameStore.joinRoom(roomId.value, password.value, playerName.value);
    
    // 加入成功后跳转到房间页面
    router.push({ name: 'room', params: { id: roomId.value } });
  } catch (err) {
    error.value = err.message || '加入房间失败，请检查房间ID和密码是否正确';
    console.error('加入房间失败:', err);
  } finally {
    loading.value = false;
  }
}
</script> 