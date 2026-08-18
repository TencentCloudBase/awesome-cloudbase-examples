<template>
  <div class="create-room">
    <div class="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-center mb-6">创建游戏房间</h1>
      
      <form @submit.prevent="createRoom" class="space-y-6">
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
          <label class="text-sm font-medium text-gray-700 flex items-center justify-between">
            <span>房间密码</span>
            <span class="text-xs text-gray-500">
              (用于控制谁可以加入房间)
            </span>
          </label>
          <div class="flex space-x-2">
            <input
              v-model="password"
              type="text"
              class="input w-full"
              placeholder="房间密码"
              :disabled="useRandomPassword"
              required
            />
            <button
              type="button"
              class="btn btn-secondary whitespace-nowrap"
              @click="generatePassword"
            >
              随机生成
            </button>
          </div>
          <div class="flex items-center mt-1">
            <input
              id="useRandomPassword"
              v-model="useRandomPassword"
              type="checkbox"
              class="h-4 w-4 text-blue-600 rounded"
              @change="handleRandomPasswordChange"
            />
            <label for="useRandomPassword" class="ml-2 text-sm text-gray-600">
              使用随机密码
            </label>
          </div>
        </div>
        
        <div class="pt-4">
          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="loading"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-plus mr-2"></i>
            创建房间
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import { generateRoomPassword } from '@/utils/gameUtils';

const router = useRouter();
const gameStore = useGameStore();

const playerName = ref('');
const password = ref('');
const useRandomPassword = ref(true);
const loading = ref(false);
const error = ref('');

// 初始化随机密码
generatePassword();

function generatePassword() {
  password.value = generateRoomPassword();
}

function handleRandomPasswordChange() {
  if (useRandomPassword.value) {
    generatePassword();
  }
}

async function createRoom() {
  if (!playerName.value || !password.value) {
    error.value = '请填写所有必填字段';
    return;
  }
  
  try {
    loading.value = true;
    error.value = '';
    
    const roomId = await gameStore.createNewRoom(playerName.value, password.value);
    
    // 创建成功后跳转到房间页面
    router.push({ name: 'room', params: { id: roomId } });
  } catch (err) {
    error.value = err.message || '创建房间失败，请稍后重试';
    console.error('创建房间失败:', err);
  } finally {
    loading.value = false;
  }
}
</script> 