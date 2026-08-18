<template>
  <div class="room">
    <div v-if="!roomLoaded" class="flex flex-col items-center justify-center py-12">
      <div class="text-2xl font-semibold mb-4">正在加载房间...</div>
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="!authenticated" class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-center mb-6">加入房间</h1>
      
      <div class="mb-6 text-center">
        <div class="text-gray-700 mb-2">房间ID: <span class="font-medium">{{ id }}</span></div>
      </div>
      
      <form @submit.prevent="verifyAndJoin" class="space-y-6">
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
    
    <div v-else class="game-container">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <GameBoard 
            :board="gameStore.board" 
            :can-play="canPlay"
            :last-move="gameStore.lastMove"
            @place-stone="placeStone"
          />
          
          <div v-if="gameStore.isWatching" class="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-center">
            您正在观战模式，无法参与游戏
          </div>
        </div>
        
        <div>
          <GameStatus 
            :game-status="gameStore.gameStatus"
            :current-turn="gameStore.currentTurn"
            :black-player="gameStore.blackPlayer"
            :white-player="gameStore.whitePlayer"
            :room-id="id"
            :is-spectator="gameStore.isWatching"
            @restart="restartGame"
            @exit="exitGame"
          />
          
          <div class="mt-6 bg-white shadow rounded-lg p-4">
            <h3 class="text-lg font-semibold mb-2">房间信息</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">房间ID:</span>
                <span class="font-medium">{{ id }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">房间密码:</span>
                <span class="font-medium">{{ gameStore.roomPassword }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">您的角色:</span>
                <span class="font-medium">{{ playerRoleName }}</span>
              </div>
            </div>
            
            <div class="mt-4">
              <div class="text-sm text-gray-600 mb-2">分享给好友:</div>
              <div class="flex flex-col space-y-2">
                <textarea
                  ref="shareTextArea"
                  class="input text-xs w-full h-20 resize-none"
                  :value="shareText"
                  readonly
                />
                <div class="flex space-x-2">
                  <button
                    class="btn btn-primary flex-1"
                    @click="copyShareText"
                  >
                    <i class="fas fa-copy mr-1"></i>
                    复制邀请
                  </button>
                  <button
                    v-if="isWeChatBrowser"
                    class="btn btn-success flex-1"
                    @click="shareToWechat"
                  >
                    <i class="fab fa-weixin mr-1"></i>
                    分享到微信
                  </button>
                </div>
              </div>
              <div v-if="copied" class="text-xs text-green-600 mt-1 text-center">
                邀请信息已复制
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 游戏结束提示 -->
    <div v-if="gameStore.isGameOver" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 class="text-2xl font-bold mb-4">
          <template v-if="gameStore.gameStatus === 'draw'">
            平局！
          </template>
          <template v-else-if="gameStore.gameStatus === 'black_win'">
            {{ gameStore.blackPlayer?.name }}获胜！
          </template>
          <template v-else-if="gameStore.gameStatus === 'white_win'">
            {{ gameStore.whitePlayer?.name }}获胜！
          </template>
        </h2>
        <div class="space-x-4">
          <button
            v-if="!gameStore.isWatching"
            @click="restartGame"
            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            继续对战
          </button>
          <button
            @click="createNewRoom"
            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            创建新房间
          </button>
          <button
            @click="exitRoom"
            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import { getPlayerRoleName } from '@/utils/gameUtils';
import GameBoard from '@/components/GameBoard.vue';
import GameStatus from '@/components/GameStatus.vue';
import PasswordInput from '@/components/PasswordInput.vue';

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();

const id = ref(route.params.id);
const playerName = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const roomLoaded = ref(false);
const authenticated = ref(false);
const copied = ref(false);

// 计算属性
const canPlay = computed(() => {
  return (
    gameStore.gameStatus === 'playing' &&
    gameStore.isMyTurn &&
    !gameStore.isWatching
  );
});

const playerRoleName = computed(() => {
  return getPlayerRoleName(gameStore.playerRole);
});

const shareLink = computed(() => {
  // 获取当前页面URL的基础部分（包含子路径）
  const baseUrl = window.location.href.split('#')[0];
  return `${baseUrl}#/room/${id.value}`;
});

// 计算分享文本
const shareText = computed(() => {
  const gameStatus = gameStore.gameStatus === 'waiting' ? '等待加入' : '对局进行中';
  
  const inviteText = 
    `🎮 五子棋对战邀请\n\n` +
    `🎲 房间状态：${gameStatus}\n` +
    `🎫 房间号：${id.value}\n` +
    `🔑 密码：${gameStore.roomPassword}\n\n` +
    `📱 点击加入：${shareLink.value}`;
  return inviteText;
});

// 检测是否在微信浏览器中
const isWeChatBrowser = computed(() => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
});

// 复制分享文本
const shareTextArea = ref(null);
async function copyShareText() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 对于支持 Clipboard API 的现代浏览器
      await navigator.clipboard.writeText(shareText.value);
    } else {
      // 回退方案
      const textArea = shareTextArea.value;
      textArea.select();
      document.execCommand('copy');
    }
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
  }
}

// 分享到微信
function shareToWechat() {
  if (typeof window !== 'undefined' && window.wx) {
    window.wx.ready(() => {
      window.wx.updateAppMessageShareData({
        title: '五子棋对战邀请',
        desc: shareText.value,
        link: shareLink.value,
        imgUrl: `${window.location.origin}/logo.png`, // 确保有一个合适的logo图片
        success: function () {
          console.log('分享设置成功');
        }
      });
    });
  }
}

// 生命周期钩子
onMounted(async () => {
  // 检查当前游戏状态
  if (gameStore.roomId === id.value) {
    authenticated.value = true;
    roomLoaded.value = true;
  } else {
    // 尝试自动重连到之前的房间
    const { success, message } = await gameStore.reconnectToRoom();
    
    if (success && gameStore.roomId === id.value) {
      // 成功恢复之前的房间状态
      authenticated.value = true;
      roomLoaded.value = true;
    } else if (success && gameStore.roomId !== id.value) {
      // 用户之前在其他房间，需要退出并重新验证这个房间
      gameStore.exitGame();
      roomLoaded.value = true;
    } else {
      // 没有之前的状态或恢复失败
      roomLoaded.value = true;
    }
  }
});

onBeforeUnmount(() => {
  // 如果离开页面但不是退出游戏，保持连接
});

// 方法
async function verifyAndJoin() {
  if (!playerName.value || !password.value) {
    error.value = '请填写所有必填字段';
    return;
  }
  
  try {
    loading.value = true;
    error.value = '';
    
    await gameStore.joinRoom(id.value, password.value, playerName.value);
    authenticated.value = true;
  } catch (err) {
    error.value = err.message || '加入房间失败，请检查密码是否正确';
    console.error('加入房间失败:', err);
  } finally {
    loading.value = false;
  }
}

async function placeStone(row, col) {
  await gameStore.placeStone(row, col);
}

async function restartGame() {
  if (await gameStore.restartGame()) {
    // 重新开始成功
  }
}

function exitGame() {
  gameStore.exitGame();
  router.push('/');
}

// 创建新房间
const createNewRoom = () => {
  gameStore.exitGame();
  router.push('/create');
};

// 退出房间
const exitRoom = () => {
  gameStore.exitGame();
  router.push('/');
};

// 获取玩家名称
const getPlayerName = (role) => {
  if (role === 'BLACK') {
    return gameStore.blackPlayer?.name || '黑棋';
  }
  if (role === 'WHITE') {
    return gameStore.whitePlayer?.name || '白棋';
  }
  return '未知玩家';
};
</script>

<style scoped>
.game-container {
  max-width: 1200px;
  margin: 0 auto;
}

.btn-success {
  @apply bg-green-500 hover:bg-green-600 text-white;
}
</style> 